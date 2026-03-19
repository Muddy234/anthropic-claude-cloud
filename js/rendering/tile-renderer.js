// ============================================================================
// TILE RENDERER - Procedural Pixel Art Tilesets
// ============================================================================
// Renders environment tiles from pixel data arrays without external image files.
// Achieves Desktop Dungeons-style chunky pixel art for dungeon environments.
// ============================================================================

const TileRenderer = {
    // Cache for rendered tiles (avoid re-drawing every frame)
    cache: new Map(),

    // Default pixel scale (each "pixel" becomes NxN screen pixels)
    defaultScale: 2,

    // Standard tile size
    TILE_SIZE: 16,

    // ========================================================================
    // CORE RENDERING
    // ========================================================================

    /**
     * Render a tile definition to a canvas/context
     * @param {CanvasRenderingContext2D} ctx - Target context
     * @param {Object} tile - Tile definition with pixels and palette
     * @param {number} x - Screen X position
     * @param {number} y - Screen Y position
     * @param {number} scale - Pixel scale multiplier
     * @param {Object} options - Optional overrides (palette, variant, etc.)
     */
    draw(ctx, tile, x, y, scale = this.defaultScale, options = {}) {
        if (!tile || !tile.pixels) return;

        const cacheKey = this._getCacheKey(tile, scale, options);

        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            ctx.drawImage(cached, Math.floor(x), Math.floor(y));
            return;
        }

        // Render to cache
        const rendered = this._renderToCanvas(tile, scale, options);
        this.cache.set(cacheKey, rendered);
        ctx.drawImage(rendered, Math.floor(x), Math.floor(y));
    },

    /**
     * Render tile to an offscreen canvas
     */
    _renderToCanvas(tile, scale, options) {
        const width = tile.width * scale;
        const height = tile.height * scale;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Disable smoothing for crisp pixels
        ctx.imageSmoothingEnabled = false;

        const palette = options.palette || tile.palette;
        const pixels = tile.pixels;

        // Draw each pixel
        for (let py = 0; py < tile.height; py++) {
            const row = pixels[py];
            if (!row) continue;

            for (let px = 0; px < tile.width; px++) {
                const char = row[px];
                // For tiles, we typically don't have transparency - use background
                const color = palette[char];
                if (!color) continue;

                ctx.fillStyle = color;
                ctx.fillRect(px * scale, py * scale, scale, scale);
            }
        }

        // Apply optional shadow effect
        if (options.shadow) {
            this._addShadow(ctx, width, height, options.shadowColor || 'rgba(0,0,0,0.3)');
        }

        return canvas;
    },

    /**
     * Add shadow overlay to bottom-right edges
     */
    _addShadow(ctx, width, height, color) {
        ctx.fillStyle = color;
        // Bottom edge shadow
        ctx.fillRect(0, height - 2, width, 2);
        // Right edge shadow
        ctx.fillRect(width - 2, 0, 2, height);
    },

    /**
     * Generate cache key for tile variant
     */
    _getCacheKey(tile, scale, options) {
        const name = tile.name || 'unnamed';
        const paletteKey = options.palette ? JSON.stringify(options.palette) : 'default';
        const variant = options.variant || 0;
        return `${name}_${scale}_${paletteKey}_v${variant}`;
    },

    /**
     * Clear the tile cache
     */
    clearCache() {
        this.cache.clear();
    },

    // ========================================================================
    // PALETTE UTILITIES
    // ========================================================================

    /**
     * Create a palette-swapped version of a tile
     */
    swapPalette(tile, newPalette) {
        return {
            ...tile,
            palette: { ...tile.palette, ...newPalette }
        };
    },

    /**
     * Apply environment lighting to a tile palette
     */
    applyLighting(palette, lightColor, intensity) {
        const lit = {};
        for (const [key, color] of Object.entries(palette)) {
            lit[key] = this._blendColors(color, lightColor, intensity);
        }
        return lit;
    },

    _blendColors(base, blend, amount) {
        const b = this._hexToRgb(base);
        const l = this._hexToRgb(blend);
        return this._rgbToHex(
            Math.round(b.r + (l.r - b.r) * amount),
            Math.round(b.g + (l.g - b.g) * amount),
            Math.round(b.b + (l.b - b.b) * amount)
        );
    },

    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    },

    _rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.max(0, Math.min(255, x)).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
};

// ============================================================================
// ENVIRONMENT PALETTES
// ============================================================================

const TILE_PALETTES = {
    // Volcanic Caverns
    volcanic: {
        floorDark: '#2A1810',
        floorMid: '#4A3020',
        floorLight: '#6B4530',
        wallDark: '#1A0808',
        wallMid: '#3A2018',
        wallLight: '#5A3828',
        accent: '#FF6B35',
        glow: '#FFAA44'
    },

    // Frozen Depths
    frozen: {
        floorDark: '#1A2A3A',
        floorMid: '#2A4A5A',
        floorLight: '#4A6A7A',
        wallDark: '#0A1A2A',
        wallMid: '#2A3A4A',
        wallLight: '#4A5A6A',
        accent: '#88CCFF',
        glow: '#AAEEFF'
    },

    // Ancient Catacombs
    catacombs: {
        floorDark: '#1A1A18',
        floorMid: '#2A2A25',
        floorLight: '#3A3A32',
        wallDark: '#151512',
        wallMid: '#252520',
        wallLight: '#454540',
        accent: '#88AA88',
        glow: '#FFFF66'
    },

    // Crystal Caves
    crystal: {
        floorDark: '#2A2520',
        floorMid: '#4A4035',
        floorLight: '#6A5A4A',
        wallDark: '#1A1510',
        wallMid: '#3A3028',
        wallLight: '#5A4A3A',
        accent: '#AA88CC',
        glow: '#DDBBFF'
    },

    // Sunken Ruins
    sunken: {
        floorDark: '#1A2520',
        floorMid: '#2A3A35',
        floorLight: '#3A4A45',
        wallDark: '#0A1510',
        wallMid: '#1A2A25',
        wallLight: '#2A3A35',
        accent: '#4488BB',
        glow: '#66CCCC'
    },

    // Shadow Realm
    shadow: {
        floorDark: '#0A0510',
        floorMid: '#1A1020',
        floorLight: '#2A1A30',
        wallDark: '#050308',
        wallMid: '#100818',
        wallLight: '#1A1028',
        accent: '#8844AA',
        glow: '#FF44FF'
    },

    // Temple Halls
    temple: {
        floorDark: '#3A3530',
        floorMid: '#5A5550',
        floorLight: '#7A756A',
        wallDark: '#2A2520',
        wallMid: '#4A4540',
        wallLight: '#6A655A',
        accent: '#FFDD77',
        glow: '#FFFFCC'
    },

    // Standard Dungeon
    dungeon: {
        floorDark: '#1A1A1A',
        floorMid: '#2A2A2A',
        floorLight: '#3A3A3A',
        wallDark: '#101010',
        wallMid: '#202020',
        wallLight: '#303030',
        accent: '#555555',
        glow: '#888888'
    }
};

// ============================================================================
// TILE DEFINITIONS
// ============================================================================
// Each tile is defined as:
// - width/height: Pixel dimensions (typically 16x16)
// - pixels: Array of strings, each char maps to palette
// - palette: Character -> hex color mapping
// - name: Identifier for caching
// - walkable: Whether entities can walk on this tile
// - type: Category (floor, wall, decoration, hazard)
// ============================================================================

const TILE_SPRITES = {

    // ========================================================================
    // STANDARD DUNGEON TILES
    // ========================================================================

    // --- FLOORS ---
    // Soft gradients without hard outlines - multiple variants for natural look
    // Uses subtle color transitions that blend when tiled together

    // STONE FLOOR - Variant 1 (base)
    stone_floor: {
        name: 'stone_floor',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "MMMLLLLMMMMLLLMM",
            "MMLLLLLLMMLLLLMM",
            "MLLLLLLLMLLLLLML",
            "LLLLMMLLLLLMMLLL",
            "LLLMMMMLLLLMMMLM",
            "MLMMMMMMLLLMMMLL",
            "MMMMMMLLLLLMMMLL",
            "MMMMLLLLLLLMMLLL",
            "MMLLLLLLLLLLLLLL",
            "MLLLLLMLLLLLLLLM",
            "LLLLLMMMLLLLLMMM",
            "LLLLMMMMMLLLLMMM",
            "LLLMMMMMMMLLLMMM",
            "LLMMMMLLLMMLMMMM",
            "LMMMLLLLLLMLLLMM",
            "MMMLLLLLLLLLLLLM"
        ],
        palette: {
            'M': '#2A2A2A',  // Mid stone
            'L': '#323232'   // Light stone
        }
    },

    // STONE FLOOR - Variant 2
    stone_floor_v2: {
        name: 'stone_floor_v2',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "LLLLMMMMMLLLLMMM",
            "LLLLLMMMMLLLLLMM",
            "LLLLLLMMMLLLLLLM",
            "MLLLLLLMMLLLLLLL",
            "MMLLLLLLLLLLLLLM",
            "MMMLLLLLLLLLLLMM",
            "MMMMLLLLLLLLLMMM",
            "LLMMMLLLLLLLMMMM",
            "LLLMMMLLLLMMMMMM",
            "LLLLLMMLLLMMMMML",
            "MLLLLLLLLMMMMLLL",
            "MMLLLLLLMMMLLLLL",
            "MMMLLLLLMMLLLLLM",
            "MMMMLLLLLLLLLLMM",
            "LMMMMLLLLLLLLMMM",
            "LLMMMMLLLLLMMMMM"
        ],
        palette: {
            'M': '#282828',
            'L': '#303030'
        }
    },

    // STONE FLOOR - Variant 3
    stone_floor_v3: {
        name: 'stone_floor_v3',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "MMLLLLLLLLLLLMMM",
            "MLLLLLLLLLLLLMMM",
            "LLLLLLLLLLLLLMML",
            "LLLLLLMMLLLLLMLL",
            "LLLLLMMMMLLLLLLL",
            "LLLLMMMMMMLLLLLL",
            "LLLMMMMMMMMLLLLL",
            "LLMMMMMMMMMMLLLL",
            "LMMMMMMMMMMMMLLL",
            "MMMMMMLLLMMMMLLM",
            "MMMMLLLLLLMMMLLM",
            "MMMLLLLLLLLLLLMM",
            "MMLLLLLLLLLLLMMM",
            "MLLLLLLLLLLLMMMM",
            "LLLLLLLLLLMMMMMM",
            "LLLLLLLLLMMMMMMM"
        ],
        palette: {
            'M': '#2C2C2C',
            'L': '#343434'
        }
    },

    // STONE FLOOR - Variant 4 (slightly darker)
    stone_floor_v4: {
        name: 'stone_floor_v4',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "LLLMMMMMLLLLLMML",
            "LLLLMMMMLLLLLMLL",
            "MLLLLLMMLLLLLLLL",
            "MMLLLLLLLLLLLLLL",
            "MMMLLLLLLLLLLLLL",
            "LMMMLLLLLLLLLLMM",
            "LLMMMLLLLLLLMMMM",
            "LLLMMMLLLLLMMMMM",
            "LLLLMMMLLLMMMMMM",
            "LLLLLMMMMMMMMMML",
            "LLLLLLMMMMMMMMLL",
            "MLLLLLLLMMMMMLLM",
            "MMLLLLLLLMMLLLMM",
            "MMMLLLLLLLLLLLMM",
            "MMMMLLLLLLLLLLML",
            "MMMMMLLLLLLLLMLL"
        ],
        palette: {
            'M': '#262626',
            'L': '#2E2E2E'
        }
    },

    // STONE FLOOR - Worn variant 1
    stone_floor_worn: {
        name: 'stone_floor_worn',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "MMMLLLLMMMCLLLMM",
            "MMLLCLLLLMLLLLMM",
            "MLLLLLLLMLLLLLML",
            "LLLLMMLLLLLCMLLL",
            "LLLMCMMLLLLMMMLM",
            "MLMMMMMMLCLMMMLL",
            "MMMMMCLLLLLMMMLL",
            "MMMMLLLCLLCMMLLL",
            "MMLLLLLLLLLLLLLL",
            "MLLLCLMLLLLLLLLM",
            "LLLLLMMMLLLLLMMM",
            "LLLLMMMMMCLLLMMM",
            "LCLMMMMMMMLLLMMM",
            "LLMMMMLLLMMLMMMM",
            "LMMMLLCLLLMLLLMM",
            "MMMLLLLLLLLCLLCM"
        ],
        palette: {
            'M': '#2A2A2A',
            'L': '#323232',
            'C': '#1E1E1E'   // Subtle cracks
        }
    },

    // STONE FLOOR - Worn variant 2
    stone_floor_worn_v2: {
        name: 'stone_floor_worn_v2',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "LLLLMMMCMLLLLMMM",
            "LLLLLMMMMLCLLLMM",
            "LLCLLLMMMLLLLLLM",
            "MLLLLLLMMLLLLLLL",
            "MMLCLLLLLLLCLLLL",
            "MMMLLLLLLLLLLLMM",
            "MMMMLLLLLCLLLMMM",
            "LLMMMLLLLLLLMMMM",
            "LLLMMMLLCLMMMMMM",
            "LLLLLMMLLLMMCMML",
            "MLLLLCLLLMMMMLLL",
            "MMLLLLLCMMMLLLLL",
            "MMMLLLLLMMLCLLLM",
            "MMMMCLLLLLLLLCMM",
            "LMMMMLLLLLLLLMMM",
            "LLMMMMLCLCLMMMMM"
        ],
        palette: {
            'M': '#282828',
            'L': '#303030',
            'C': '#1C1C1C'
        }
    },

    // STONE FLOOR - Dirty variant 1
    stone_floor_dirty: {
        name: 'stone_floor_dirty',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "MMMLLXLMMMMLLLMM",
            "MMLLXLLLMMLLLLMM",
            "MLLLLLLLMLLLXXML",
            "LLLLMMLLLLLMMLLL",
            "LLLMMMMLLLLMMMLM",
            "MLMMMXMMLLLMMMLL",
            "MMMMMMLLLXLMMMLL",
            "MMMMLLLLLLLMMLLL",
            "MMLLLLXXLLLLLLLL",
            "MLLLLLMLLLLLLLLM",
            "LLLLLMMMLLLLLMMM",
            "LLLLMXMMMLLLLMMM",
            "LLLMMMMMXMLLLMMM",
            "LLMMMMLLLMMLMMMM",
            "LMMMLLLLLLMLXLMM",
            "MMMLLXXLLLLLLLLM"
        ],
        palette: {
            'M': '#2A2A2A',
            'L': '#323232',
            'X': '#252520'   // Dirt patches
        }
    },

    // STONE FLOOR - Dirty variant 2
    stone_floor_dirty_v2: {
        name: 'stone_floor_dirty_v2',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "LLLLMMMMMLLXLMMM",
            "LLLLLMXMMLLLLLMM",
            "LLLLLLMMMLLLLLLM",
            "MLLLXLLMMLLLLLLL",
            "MMLLLLLLLLLXLLLL",
            "MMMLLLLLXLLLLLMM",
            "MMMMLLLLLLLLLMMM",
            "LLMXMLLLLLLLMMMM",
            "LLLMMMLLLLMMMMMM",
            "LLLLLMMLLLMMMXML",
            "MLLLLLLLLMMMMLLL",
            "MMLLLLLLMXMLLLLL",
            "MXMLLLLLMMLLLLLM",
            "MMMMLLLLLLXLLLMM",
            "LMMMMLLLLLLLLMMM",
            "LLMMXMLLLLLMMMMM"
        ],
        palette: {
            'M': '#282828',
            'L': '#303030',
            'X': '#232320'
        }
    },

    // --- WALLS ---

    brick_wall: {
        name: 'brick_wall',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "HHHHHHHHHHHHHHHH",
            "DMMMMDDDMMMMDDDM",
            "DMMMMLLLDMMMLLLM",
            "DMMMMLLLDMMMLLLM",
            "DDDDDDDDDDDDDDDD",
            "MMDDDMMMMDDDMMMM",
            "MLLLDMMMMLLLDMMM",
            "MLLLDMMMMLLLDMMM",
            "DDDDDDDDDDDDDDDD",
            "DMMMMDDDMMMMDDDM",
            "DMMMMLLLDMMMLLLM",
            "DMMMMLLLDMMMLLLM",
            "DDDDDDDDDDDDDDDD",
            "MMDDDMMMMDDDMMMM",
            "MLLLDMMMMLLLDMMM",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'H': '#404040',  // Highlight top
            'D': '#101010',  // Dark mortar
            'M': '#282828',  // Mid brick
            'L': '#353535',  // Light brick
            'S': '#0A0A0A'   // Shadow bottom
        }
    },

    brick_wall_mossy: {
        name: 'brick_wall_mossy',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "HHHHHHHHHHHHHHHH",
            "DMMMMDDDMMMMDDDM",
            "DMMMMLLLDMMMLLLM",
            "DMMMMLLLDMMMLLLM",
            "DDDDDDDDDDDDDDDD",
            "MMDDDMMMMDDDMGGG",
            "MLLLDMMMMLLLDGGG",
            "MLLLDMMMMLLLDGGG",
            "DDDDDDDDDDDDDDDD",
            "DGGGGDDDMMMMDDDM",
            "DGGGGLLLDMMMLLLM",
            "DGGGGLLLDMMMLLLM",
            "DDDDDDDDDDDDDDDD",
            "MMDDDMMMMDDDMMMM",
            "MLLLDMMMMLLLDMMM",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'H': '#404040',
            'D': '#101010',
            'M': '#282828',
            'L': '#353535',
            'S': '#0A0A0A',
            'G': '#2A4428'   // Moss green
        }
    },

    stone_wall: {
        name: 'stone_wall',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "HHHHHHHHHHHHHHHH",
            "LLLLLLLLLLLLLLLL",
            "LMMMMLLLMMMMMLLM",
            "LMDDMLLLDDDDDLLM",
            "LMDDMLLLDDDDDLLM",
            "LLLLLLLLLLLLLLLL",
            "LLLMMMMMMLLMMMML",
            "LLLDDDDDMLLDDDDL",
            "LLLDDDDDMLLDDDDL",
            "LLLLLLLLLLLLLLLL",
            "LMMMMMLLLLMMMMML",
            "LDDDDDLLLLDDDDML",
            "LDDDDDLLLLDDDDML",
            "LLLLLLLLLLLLLLLL",
            "MMMMMMMMMMMMMMMM",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'H': '#454545',
            'L': '#303030',
            'M': '#252525',
            'D': '#1A1A1A',
            'S': '#101010'
        }
    },

    // --- WALL EDGES ---

    wall_top: {
        name: 'wall_top',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "TTTTTTTTTTTTTTTT",
            "TTTTTTTTTTTTTTTT",
            "TTTTTTTTTTTTTTTT",
            "HHHHHHHHHHHHHHHH",
            "LLLLLLLLLLLLLLLL",
            "MMMMMMMMMMMMMMMM",
            "MMMMMMMMMMMMMMMM",
            "DDDDDDDDDDDDDDDD",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ],
        palette: {
            'T': '#383838',  // Top surface
            'H': '#454545',  // Highlight edge
            'L': '#303030',
            'M': '#252525',
            'D': '#1A1A1A',
            '.': '#1A1A1A'   // Transparent/floor color below
        }
    },

    // --- CORNERS ---

    // Inner corner NW: Wall corner with left edge highlighted
    // Left edge catches light, seamlessly tiles with walls
    wall_corner_nw: {
        name: 'wall_corner_nw',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "HHHHHHHHHHHHHHHH",
            "CMMMMDDDMMMMDDDM",
            "CMMMMLLLDMMMLLLM",
            "CMMMMLLLDMMMLLLM",
            "CDDDDDDDDDDDDDDD",
            "CMMDDDMMMMDDDMMM",
            "CLLLDMMMMLLLDMMM",
            "CLLLDMMMMLLLDMMM",
            "CDDDDDDDDDDDDDDD",
            "CMMMMDDDMMMMDDDM",
            "CMMMMLLLDMMMLLLM",
            "CMMMMLLLDMMMLLLM",
            "CDDDDDDDDDDDDDDD",
            "CMMDDDMMMMDDDMMM",
            "CLLLDMMMMLLLDMMM",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'H': '#404040',  // Highlight top
            'C': '#484848',  // Corner edge highlight (left)
            'D': '#101010',  // Dark mortar
            'M': '#282828',  // Mid brick
            'L': '#353535',  // Light brick
            'S': '#0A0A0A'   // Shadow bottom
        }
    },

    // Inner corner NE: Wall corner with right edge highlighted
    wall_corner_ne: {
        name: 'wall_corner_ne',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "HHHHHHHHHHHHHHHH",
            "DMMMMDDDMMMMDDDM",
            "DMMMMLLLDMMMLLLM",
            "DMMMMLLLDMMMLLLM",
            "DDDDDDDDDDDDDDDD",
            "MMDDDMMMMDDDMMMM",
            "MLLLDMMMMLLLDMMM",
            "MLLLDMMMMLLLDMMM",
            "DDDDDDDDDDDDDDDD",
            "DMMMMDDDMMMMDDDM",
            "DMMMMLLLDMMMLLLM",
            "DMMMMLLLDMMMLLLM",
            "DDDDDDDDDDDDDDDD",
            "MMDDDMMMMDDDMMMM",
            "MLLLDMMMMLLLDMMM",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'H': '#404040',
            'D': '#101010',
            'M': '#282828',
            'L': '#353535',
            'S': '#0A0A0A'
        }
    },

    // Inner corner SW: Wall corner with left edge highlighted
    wall_corner_sw: {
        name: 'wall_corner_sw',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "HHHHHHHHHHHHHHHH",
            "CMMMMDDDMMMMDDDM",
            "CMMMMLLLDMMMLLLM",
            "CMMMMLLLDMMMLLLM",
            "CDDDDDDDDDDDDDDD",
            "CMMDDDMMMMDDDMMM",
            "CLLLDMMMMLLLDMMM",
            "CLLLDMMMMLLLDMMM",
            "CDDDDDDDDDDDDDDD",
            "CMMMMDDDMMMMDDDM",
            "CMMMMLLLDMMMLLLM",
            "CMMMMLLLDMMMLLLM",
            "CDDDDDDDDDDDDDDD",
            "CMMDDDMMMMDDDMMM",
            "CLLLDMMMMLLLDMMM",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'H': '#404040',
            'C': '#484848',
            'D': '#101010',
            'M': '#282828',
            'L': '#353535',
            'S': '#0A0A0A'
        }
    },

    // Inner corner SE: Standard wall (no special edge needed)
    wall_corner_se: {
        name: 'wall_corner_se',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "HHHHHHHHHHHHHHHH",
            "DMMMMDDDMMMMDDDM",
            "DMMMMLLLDMMMLLLM",
            "DMMMMLLLDMMMLLLM",
            "DDDDDDDDDDDDDDDD",
            "MMDDDMMMMDDDMMMM",
            "MLLLDMMMMLLLDMMM",
            "MLLLDMMMMLLLDMMM",
            "DDDDDDDDDDDDDDDD",
            "DMMMMDDDMMMMDDDM",
            "DMMMMLLLDMMMLLLM",
            "DMMMMLLLDMMMLLLM",
            "DDDDDDDDDDDDDDDD",
            "MMDDDMMMMDDDMMMM",
            "MLLLDMMMMLLLDMMM",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'H': '#404040',
            'D': '#101010',
            'M': '#282828',
            'L': '#353535',
            'S': '#0A0A0A'
        }
    },

    // Outer corner: Solid wall block (pillar) - same as brick_wall
    wall_corner_outer_nw: {
        name: 'wall_corner_outer_nw',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "HHHHHHHHHHHHHHHH",
            "DMMMMDDDMMMMDDDM",
            "DMMMMLLLDMMMLLLM",
            "DMMMMLLLDMMMLLLM",
            "DDDDDDDDDDDDDDDD",
            "MMDDDMMMMDDDMMMM",
            "MLLLDMMMMLLLDMMM",
            "MLLLDMMMMLLLDMMM",
            "DDDDDDDDDDDDDDDD",
            "DMMMMDDDMMMMDDDM",
            "DMMMMLLLDMMMLLLM",
            "DMMMMLLLDMMMLLLM",
            "DDDDDDDDDDDDDDDD",
            "MMDDDMMMMDDDMMMM",
            "MLLLDMMMMLLLDMMM",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'H': '#404040',
            'D': '#101010',
            'M': '#282828',
            'L': '#353535',
            'S': '#0A0A0A'
        }
    },

    // ========================================================================
    // VOLCANIC CAVERN TILES
    // ========================================================================

    // VOLCANIC FLOOR - Variant 1
    volcanic_floor: {
        name: 'volcanic_floor',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "MMMLLLLMMMMLLLMM",
            "MMLLLLLLMMLLLLMM",
            "MLLLLLLLMLLLLLML",
            "LLLLMMLLLLLMMLLL",
            "LLLMMMMLLLLMMMLM",
            "MLMMMMMMLLLMMMLL",
            "MMMMMMLLLLLMMMLL",
            "MMMMLLLLLLLMMLLL",
            "MMLLLLLLLLLLLLLL",
            "MLLLLLMLLLLLLLLM",
            "LLLLLMMMLLLLLMMM",
            "LLLLMMMMMLLLLMMM",
            "LLLMMMMMMMLLLMMM",
            "LLMMMMLLLMMLMMMM",
            "LMMMLLLLLLMLLLMM",
            "MMMLLLLLLLLLLLLM"
        ],
        palette: {
            'M': '#4A3020',
            'L': '#5C3828'
        }
    },

    // VOLCANIC FLOOR - Variant 2
    volcanic_floor_v2: {
        name: 'volcanic_floor_v2',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "LLLLMMMMMLLLLMMM",
            "LLLLLMMMMLLLLLMM",
            "LLLLLLMMMLLLLLLM",
            "MLLLLLLMMLLLLLLL",
            "MMLLLLLLLLLLLLLM",
            "MMMLLLLLLLLLLLMM",
            "MMMMLLLLLLLLLMMM",
            "LLMMMLLLLLLLMMMM",
            "LLLMMMLLLLMMMMMM",
            "LLLLLMMLLLMMMMML",
            "MLLLLLLLLMMMMLLL",
            "MMLLLLLLMMMLLLLL",
            "MMMLLLLLMMLLLLLM",
            "MMMMLLLLLLLLLLMM",
            "LMMMMLLLLLLLLMMM",
            "LLMMMMLLLLLMMMMM"
        ],
        palette: {
            'M': '#3E2818',
            'L': '#503020'
        }
    },

    // VOLCANIC FLOOR - Cracked variant 1
    volcanic_floor_cracked: {
        name: 'volcanic_floor_cracked',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "MMMLLGLMMMMLLLMM",
            "MMLLLGLLMMLLLLMM",
            "MLLLGLLLMLLLLLML",
            "LLLLMMLLLGLMMLLL",
            "LLLMMMGLLLLMMMLM",
            "MLMMMMGMLLLMMMLL",
            "MMMMMGLLLLLMMMLL",
            "MMMMLLGLLLLMMLLL",
            "MMLLLLGLGLLLLGLL",
            "MLLLLLGLLLLLLGLM",
            "LLLLLMGMLLLLLMMM",
            "LLLLMMGMMLLLLMMM",
            "LLLMMMGMMMLLLMMM",
            "LLMMMMGLLMMLMMMM",
            "LMMMLLGLLLMLLLMM",
            "MMMLLLLGLLLLGLLM"
        ],
        palette: {
            'M': '#4A3020',
            'L': '#5C3828',
            'G': '#FF6030'   // Lava glow
        }
    },

    // VOLCANIC FLOOR - Cracked variant 2
    volcanic_floor_cracked_v2: {
        name: 'volcanic_floor_cracked_v2',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "LLLLMMMMMLLLLMMM",
            "LGLLGMMMMLLLLLMM",
            "LLGLLGMMMLLLLLLM",
            "MLLLLLLMMLLLLLLL",
            "MMLLLGLLLGLLLLLM",
            "MMMLLLLLLLGLLGMM",
            "MMMMLLLLLLLGMMMG",
            "LLMMMLLLLLLLMMMM",
            "LLLMMMGLLGMMMMMM",
            "LLLLLMMLLLMMMGML",
            "MLLLLGLLGMMMMLLL",
            "MMLLLGLGMMMLLLLL",
            "MMMLLLGLLMLLLLLM",
            "MMMMLLLLLLLLLLMM",
            "LMMMMLLLGLLLGMMM",
            "LLMMMMLLLLLMMMMM"
        ],
        palette: {
            'M': '#3E2818',
            'L': '#503020',
            'G': '#FF5020'
        }
    },

    obsidian_wall: {
        name: 'obsidian_wall',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "HHHHHHHHHHHHHHHH",
            "LLLLLLLLLLLLLLLL",
            "LMMMGGGLMMMMMLLM",
            "LMDDGGGLDDDDDLLM",
            "LMDDMLLLDDDDDLLM",
            "LLLLLLLLLLLLLLLL",
            "LLLMMMMMMLLMMMML",
            "LLLDDDDDMLLDDDDL",
            "LLLDDGGGMLLDDDDL",
            "LLLLLLGGLLLLLLLL",
            "LMMMMMGGLLMMMMML",
            "LDDDDDGGLLDDDDML",
            "LDDDDDLLLLDDDDML",
            "LLLLLLLLLLLLLLLL",
            "MMMMMMMMMMMMMMMM",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'H': '#2A2020',
            'L': '#1A0808',
            'M': '#151010',
            'D': '#0A0505',
            'S': '#050000',
            'G': '#FF4400'   // Glowing cracks
        }
    },

    lava_pool: {
        name: 'lava_pool',
        width: 16,
        height: 16,
        walkable: false,
        type: 'hazard',
        animated: true,
        pixels: [
            "LLLLLLLLLLLLLLLL",
            "LOOOOOOOOOOOOOBL",
            "LOOBBOOOOOOOOBOL",
            "LOOBBOOOYYOOOBOL",
            "LOOOOOOOYYOOOBOL",
            "LOOOOOOOOOOOOBOL",
            "LOOYOOOOOOOOOBBL",
            "LOOYYOOOOBBOOBOL",
            "LOOYOOOOOBBOOBOL",
            "LOOOOOOOOOOOOOBL",
            "LOOOOOOOYOOOOOBL",
            "LOOBOOOOYYOOOBOL",
            "LOOBBOOOOOOOOBBL",
            "LOOBBOOOOOOOOBOL",
            "LOOOOOOOOOOOOOBL",
            "LLLLLLLLLLLLLLLL"
        ],
        palette: {
            'L': '#3A1810',  // Cooled lava edge
            'O': '#FF6B35',  // Orange lava
            'B': '#FF4400',  // Bright spots
            'Y': '#FFAA44'   // Yellow hotspots
        }
    },

    // ========================================================================
    // FROZEN DEPTHS TILES
    // ========================================================================

    // FROZEN FLOOR - Variant 1
    frozen_floor: {
        name: 'frozen_floor',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "MMMLLLLMMMMLLLMM",
            "MMLLLLLLMMLLHLMM",
            "MLLLLLLLMLLLLLML",
            "LLLLMMLLLLLMMLLL",
            "LLLMHMMLLLLMMMLM",
            "MLMMMMMMLLLMMMLL",
            "MMMMMMLLLLLMMMLL",
            "MMMMLLLHLLLMMLLL",
            "MMLLLLLLLLLLLLLL",
            "MLLLLLMLLLLHLLHM",
            "LLLLLMMMLLLLLMMM",
            "LLLLMMMMMLLLLMMM",
            "LLLMMHMMMMHLLMMM",
            "LLMMMMLLLMMLMMMM",
            "LMMMLLLLLLMLLLMM",
            "MMMLLLLLLLLLLLLM"
        ],
        palette: {
            'M': '#2A4A5A',
            'L': '#3A5A6A',
            'H': '#5A7A8A'   // Subtle ice highlights
        }
    },

    // FROZEN FLOOR - Variant 2
    frozen_floor_v2: {
        name: 'frozen_floor_v2',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "LLLLMMMMMLLHLMMM",
            "LLLLLMMMMLLLLLMM",
            "LLLLLLMMMLLLLLLM",
            "MLLHLLHMMLLHLLLL",
            "MMLLLLLLLLLLLLLM",
            "MMMLLLLLLLLLLLMM",
            "MMMMLLLLLHLLLMMM",
            "LLMMMLLLLLLLMMMM",
            "LLLMMMLLLLMMMMMM",
            "LLLHLMMLLLMMMMML",
            "MLLLLLLLLMMMMLLL",
            "MMLLLLLLMMMLLLLL",
            "MMMLLLHLMMLLLLLM",
            "MMMMLLLLLLLLHLMM",
            "LMMMMLLLLLLLLMMM",
            "LLMMMMLLLLLMMMMM"
        ],
        palette: {
            'M': '#254555',
            'L': '#355565',
            'H': '#556575'
        }
    },

    // ICE FLOOR - Variant 1 (slippery)
    ice_floor: {
        name: 'ice_floor',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        hazard: 'slippery',
        pixels: [
            "LLLLHHLLLLHHLLLH",
            "LLLHHHLLLLLHHLLL",
            "LLHHHHLLLLLLHHLL",
            "LHHHHHHLLLLLHHHL",
            "HHHHHHHHLLLHHHHH",
            "LLHHHHHHHHHHHHHH",
            "LLLHHHHHHHHHHHHH",
            "LLLLHHHHHHHHHHHH",
            "LLLLLHHHHHHHHHHH",
            "HLLLLLLHHHHHHHHL",
            "HHLLLLLLLHHHHHHH",
            "HHHLLLLLLLLLHHHH",
            "HHHHHLLLLLLLLLHH",
            "HHHHHHHLLLLLLLLH",
            "LHHHHHHHHLLLLLLL",
            "LLHHHHHHHHHHLLLH"
        ],
        palette: {
            'L': '#4A6A7A',
            'H': '#5A7A8A'
        }
    },

    // ICE FLOOR - Variant 2
    ice_floor_v2: {
        name: 'ice_floor_v2',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        hazard: 'slippery',
        pixels: [
            "HHHHLLLLLLLLLHHH",
            "HHHLLLLLLLLLLLHH",
            "HHLLLLLLLLLLLLLH",
            "HLLLLLLLLHHHLLLH",
            "LLLLLLLLHHHHHLLH",
            "LLLLLLLHHHHHHLLH",
            "LLLLLLHHHHHHHLLH",
            "HLLLLHHHHHHHLLLH",
            "HHLLHHHHHHHLLLLH",
            "HHHHHHHHHHLLLLLL",
            "LHHHHHHHHLLLLLLL",
            "LLHHHHHHLLLLLLLH",
            "LLLHHHHLLLLLLHHH",
            "LLLLHHLLLLLLHHHH",
            "HLLLLLLLLLHHHHHH",
            "HHLLLLLLLHHHHHHH"
        ],
        palette: {
            'L': '#456575',
            'H': '#557585'
        }
    },

    ice_wall: {
        name: 'ice_wall',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "HHHHHHHHHHHHHHHH",
            "GGGGGGGGGGGGGGGG",
            "GLLLLGGGLLLLLGGL",
            "GLMMLGGGLMMMMGGL",
            "GLMMLGGGLMMMMGGL",
            "GGGGGGGGGGGGGGGG",
            "GGGLLLLLLLGGLLLG",
            "GGGLMMMMMLGGLMML",
            "GGGLMMMMMLGGLMML",
            "GGGGGGGGGGGGGGGG",
            "GLLLLLGGGGLLLLLL",
            "GMMMMMLGGGMMMMLG",
            "GMMMMMLGGGMMMMLG",
            "GGGGGGGGGGGGGGGG",
            "LLLLLLLLLLLLLLLL",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'H': '#AAEEFF',  // Frost highlight
            'G': '#88CCFF',  // Ice blue
            'L': '#4A5A6A',  // Darker ice
            'M': '#2A3A4A',  // Deep ice
            'S': '#1A2A3A'   // Shadow
        }
    },

    // ========================================================================
    // ANCIENT CATACOMB TILES
    // ========================================================================

    // TOMB FLOOR - Variant 1
    tomb_floor: {
        name: 'tomb_floor',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "MMMLLLLMMMMLLLMM",
            "MMLLLLLLMMLLLLMM",
            "MLLLLLLLMLLLLLML",
            "LLLLMMLLLLLMMLLL",
            "LLLMMMMLLLLMMMLM",
            "MLMMMMMMLLLMMMLL",
            "MMMMMMLLLLLMMMLL",
            "MMMMLLLLLLLMMLLL",
            "MMLLLLLLLLLLLLLL",
            "MLLLLLMLLLLLLLLM",
            "LLLLLMMMLLLLLMMM",
            "LLLLMMMMMLLLLMMM",
            "LLLMMMMMMMLLLMMM",
            "LLMMMMLLLMMLMMMM",
            "LMMMLLLLLLMLLLMM",
            "MMMLLLLLLLLLLLLM"
        ],
        palette: {
            'M': '#2A2A25',
            'L': '#353530'
        }
    },

    // TOMB FLOOR - Variant 2
    tomb_floor_v2: {
        name: 'tomb_floor_v2',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "LLLLMMMMMLLLLMMM",
            "LLLLLMMMMLLLLLMM",
            "LLLLLLMMMLLLLLLM",
            "MLLLLLLMMLLLLLLL",
            "MMLLLLLLLLLLLLLM",
            "MMMLLLLLLLLLLLMM",
            "MMMMLLLLLLLLLMMM",
            "LLMMMLLLLLLLMMMM",
            "LLLMMMLLLLMMMMMM",
            "LLLLLMMLLLMMMMML",
            "MLLLLLLLLMMMMLLL",
            "MMLLLLLLMMMLLLLL",
            "MMMLLLLLMMLLLLLM",
            "MMMMLLLLLLLLLLMM",
            "LMMMMLLLLLLLLMMM",
            "LLMMMMLLLLLMMMMM"
        ],
        palette: {
            'M': '#252520',
            'L': '#30302A'
        }
    },

    // TOMB FLOOR - Bones variant 1
    tomb_floor_bones: {
        name: 'tomb_floor_bones',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "MMMLLLLMMMBLLLMM",
            "MMLLBLLLMMLLLLMM",
            "MLLLLLLLMLLLLLML",
            "LLLLMMLLLLLMMLLL",
            "LLLMMMMLLLLMMMLM",
            "MLMMMMMMLBLMMMLL",
            "MMMMMMLLLLLMMMLL",
            "MMMMLLLLLLLMMBLL",
            "MMLLLLLLLLLLLLLL",
            "MLBLLBMLLLLLLLLM",
            "LLLLLMMMLLLLLMMM",
            "LLLLMMMMMLLLLMMM",
            "LLLMMMMMMMLLLMMM",
            "LLMMMMLLBMMLMMMM",
            "LMMMLLLLLLMLLLMM",
            "MMMLLLLLLLLBLLBM"
        ],
        palette: {
            'M': '#2A2A25',
            'L': '#353530',
            'B': '#9A9A90'   // Subtle bone
        }
    },

    // TOMB FLOOR - Bones variant 2
    tomb_floor_bones_v2: {
        name: 'tomb_floor_bones_v2',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "LLLLMMMMMLLLLMMM",
            "LLLLLMMMMLLLBLMM",
            "BLLLLLMMMLLLLLLM",
            "MLLLLLLMMLLLLLLL",
            "MMLLLLLLLLLLLBLM",
            "MMMLLLLLBLLLLMM",
            "MMMMLLLLLLLLLMMM",
            "LLMMMLLLLLLLMMMM",
            "BLLMMMLLLLMMMMMM",
            "LLLLLMMLLLMMMMML",
            "MLLLLLLLLMMMMLBL",
            "MMLLLLBLMMMLLLLL",
            "MMMLLLLLMMLLLLLM",
            "MMMMBLLLLLLLLLMM",
            "LMMMMLLLLLLLLMMM",
            "LLMMMMLLLBLMMMMM"
        ],
        palette: {
            'M': '#252520',
            'L': '#30302A',
            'B': '#8A8A80'
        }
    },

    crypt_wall: {
        name: 'crypt_wall',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "HHHHHHHHHHHHHHHH",
            "LLLLLLLLLLLLLLLL",
            "LMMMMMSSSMMMMLLL",
            "LMDDDDSEEDDDDLLL",
            "LMDDDDSEEDDDDLLL",
            "LMMMMMSSSMMMMLLL",
            "LLLLLLLLLLLLLLLL",
            "LLLMMMMMMLLMMMML",
            "LLLDDDDDMLLDDDDL",
            "LLLDDDDDMLLDDDDL",
            "LLLLLLLLLLLLLLLL",
            "LMMMMMMMGGMMMMMM",
            "LDDDDDMMGGDDDDMM",
            "LDDDDDMMGGDDDDMM",
            "MMMMMMMMMMMMMMMM",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'H': '#454540',
            'L': '#252520',
            'M': '#1A1A18',
            'D': '#151512',
            'S': '#444433',  // Skull niche
            'E': '#FFFF66',  // Eye glow
            'G': '#88AA88'   // Decay green
        }
    },

    // ========================================================================
    // CRYSTAL CAVE TILES
    // ========================================================================

    // CAVE FLOOR - Variant 1
    cave_floor: {
        name: 'cave_floor',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "MMMLLLLMMMMLLLMM",
            "MMLLLLLLMMLLLLMM",
            "MLLLLLLLMLLLLLML",
            "LLLLMMLLLLLMMLLL",
            "LLLMMMMLLLLMMMLM",
            "MLMMMMMMLLLMMMLL",
            "MMMMMMLLLLLMMMLL",
            "MMMMLLLLLLLMMLLL",
            "MMLLLLLLLLLLLLLL",
            "MLLLLLMLLLLLLLLM",
            "LLLLLMMMLLLLLMMM",
            "LLLLMMMMMLLLLMMM",
            "LLLMMMMMMMLLLMMM",
            "LLMMMMLLLMMLMMMM",
            "LMMMLLLLLLMLLLMM",
            "MMMLLLLLLLLLLLLM"
        ],
        palette: {
            'M': '#3A3530',
            'L': '#4A4540'
        }
    },

    // CAVE FLOOR - Variant 2
    cave_floor_v2: {
        name: 'cave_floor_v2',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "LLLLMMMMMLLLLMMM",
            "LLLLLMMMMLLLLLMM",
            "LLLLLLMMMLLLLLLM",
            "MLLLLLLMMLLLLLLL",
            "MMLLLLLLLLLLLLLM",
            "MMMLLLLLLLLLLLMM",
            "MMMMLLLLLLLLLMMM",
            "LLMMMLLLLLLLMMMM",
            "LLLMMMLLLLMMMMMM",
            "LLLLLMMLLLMMMMML",
            "MLLLLLLLLMMMMLLL",
            "MMLLLLLLMMMLLLLL",
            "MMMLLLLLMMLLLLLM",
            "MMMMLLLLLLLLLLMM",
            "LMMMMLLLLLLLLMMM",
            "LLMMMMLLLLLMMMMM"
        ],
        palette: {
            'M': '#353028',
            'L': '#454038'
        }
    },

    crystal_formation: {
        name: 'crystal_formation',
        width: 16,
        height: 16,
        walkable: false,
        type: 'decoration',
        pixels: [
            "........CC......",
            ".......CCCC.....",
            "......CCGGCC....",
            ".....CCCGGCCC...",
            "....CCCCCCCCC...",
            "...CCCCCCCCCCC..",
            "..CCCCCCCCCCCCC.",
            ".CCCGGCCCCCCCCC.",
            "CCCCGGCCCCGCCCC.",
            "CCCCCCCCCCGCCC..",
            ".CCCCCCCCCGCC...",
            "..CCCCCCCCCC....",
            "...CCCCCCCC.....",
            "....CCCCCC......",
            ".....DDDD.......",
            "......DD........"
        ],
        palette: {
            '.': '#2A2520',  // Background (cave floor)
            'C': '#AA88CC',  // Crystal purple
            'G': '#DDBBFF',  // Crystal glow
            'D': '#3A3028'   // Crystal base/shadow
        }
    },

    crystal_wall: {
        name: 'crystal_wall',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "HHHHHHHHHHHHHHHH",
            "LLLLLLLLLLLLLLLL",
            "LMMMCCCLMMMMMLLM",
            "LMDDCGCLDDDDDLLM",
            "LMDDCCCLDDDDLLM",
            "LLLLLLLLLLLLLLLL",
            "LLLMMMMMMLLMMMML",
            "LLLDDDDDMLLDDDDL",
            "LLLDDDDDMLLDDDDL",
            "LLLLLLLLLLLLLLLL",
            "LMMMMCCMLLMMMMML",
            "LDDDCGGCLLDDDDML",
            "LDDDCCCCLLDDDDML",
            "LLLLLLLLLLLLLLLL",
            "MMMMMMMMMMMMMMMM",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'H': '#5A4A3A',
            'L': '#3A3028',
            'M': '#2A2520',
            'D': '#1A1510',
            'S': '#100A05',
            'C': '#AA88CC',  // Crystal
            'G': '#DDBBFF'   // Crystal glow
        }
    },

    // ========================================================================
    // SHADOW REALM TILES
    // ========================================================================

    // VOID FLOOR - Variant 1
    void_floor: {
        name: 'void_floor',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "MMMLLLLMMMGLLLMM",
            "MMLLLLLLMMLLGLMM",
            "MLLLLLLLMLLGLLML",
            "LLLLMMLLLGLMMLLL",
            "LLLMMMMLLLLMMMLM",
            "MLMMMMMMLLLMMMLL",
            "MMMMMGLLLLLMMMLL",
            "MMMMLLLLLLLMMLLL",
            "MMLLGLLLLLLLLLLL",
            "MLLLLLMLLLLLLGLM",
            "LLLLLMMMLLLLLMMM",
            "LLLLMMMMMGLLLMMM",
            "LLLMMMMMMMLLLMMM",
            "LLMMMMLLLMMLMMMM",
            "LMMMLLLLGLMLLLMM",
            "MMMLLLLLLLLGLLLM"
        ],
        palette: {
            'M': '#1A1020',
            'L': '#201828',
            'G': '#6633AA'   // Subtle void glow
        }
    },

    // VOID FLOOR - Variant 2
    void_floor_v2: {
        name: 'void_floor_v2',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "LLLLMMMMMLLLLMMM",
            "LGLLGMMMMLLLLLMM",
            "LLLLLLMMMLLLLLLM",
            "MLLLLLLMMGLLLLLL",
            "MMLLLLLLLLLLLLLM",
            "MMMLLLLLGLLLLLMM",
            "MMMMLLLLLLLLLMMM",
            "LLMGMLLLLLLLMMMM",
            "LLLMMMLLLLMMMMMM",
            "LLLLLMMLLLMMMGML",
            "MLLLLGLLLMMMMLLL",
            "MMLLLLLLMMMLLLLL",
            "MMMLLLLLMMLGLLGM",
            "MMMMLLLLLLLLLLMM",
            "LMMMMGLLLLLLLMMM",
            "LLMMMMLLLLLMMMMM"
        ],
        palette: {
            'M': '#150C1A',
            'L': '#1C1422',
            'G': '#553388'
        }
    },

    shadow_wall: {
        name: 'shadow_wall',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "GGGGGGGGGGGGGGGG",
            "LLLLLLLLLLLLLLLL",
            "LMMMMMLLMMMMMLLM",
            "LMDDDDLLDDDDDLLM",
            "LMDDDDLLDDDDDLLM",
            "LLLLLLLLLLLLLLLL",
            "LLLMMMEEELLMMMML",
            "LLLDDDEEEMLLDDDDL",
            "LLLDDDDDMLLDDDDL",
            "LLLLLLLLLLLLLLLL",
            "LMMMMMLLLLMMMMML",
            "LDDDDDLLLLDDDDML",
            "LDDDDDLLLLDDDDML",
            "LLLLLLLLLLLLLLLL",
            "MMMMMMMMMMMMMMMM",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'G': '#FF44FF',  // Eldritch glow top
            'L': '#1A1028',
            'M': '#100818',
            'D': '#050308',
            'S': '#020104',
            'E': '#FF44FF'   // Eyes
        }
    },

    void_rift: {
        name: 'void_rift',
        width: 16,
        height: 16,
        walkable: false,
        type: 'hazard',
        animated: true,
        pixels: [
            "DDDDDDDDDDDDDDDD",
            "DDDDDPPPPPDDDDDD",
            "DDDDPPVVVPPDDDD",
            "DDDPVVVVVVVPDDD",
            "DDPPVVVVVVVPPDD",
            "DPPVVVVVVVVVPPD",
            "DPVVVVBBVVVVVPD",
            "DPVVVBBBBBVVVPD",
            "DPVVVBBBBBVVVPD",
            "DPVVVVBBVVVVVPD",
            "DPPVVVVVVVVVPPD",
            "DDPPVVVVVVVPPDD",
            "DDDPVVVVVVVPDDD",
            "DDDDPPVVVPPDDDD",
            "DDDDDPPPPPDDDD",
            "DDDDDDDDDDDDDDDD"
        ],
        palette: {
            'D': '#0A0510',  // Dark floor
            'P': '#FF44FF',  // Purple edge glow
            'V': '#8844AA',  // Void purple
            'B': '#000000'   // Pure black center
        }
    },

    // ========================================================================
    // TEMPLE HALL TILES
    // ========================================================================

    // MARBLE FLOOR - Variant 1
    marble_floor: {
        name: 'marble_floor',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "MMMLLLLMMMMLLLMM",
            "MMLLVLLLMMLLLLMM",
            "MLLLLLLLMLLLLLML",
            "LLLLMMLLLLLVMLLL",
            "LLLMMMMLLLLMMMLM",
            "MLMVMMMMLLLMMMLL",
            "MMMMMMLVLLLMMMLL",
            "MMMMLLLLLLLMMLLL",
            "MMLLLLLLLLLLLLLL",
            "MLLLLLMLVLLLLLLM",
            "LLLLLMMMLLLLLMMM",
            "LLLLMMMMMLLLLMMM",
            "LLLMMMVMMMLLLMMM",
            "LLMMMMLLLMMLMMMM",
            "LMMMLLLLLLMLLLMM",
            "MMMLLLVLLLLLLLLM"
        ],
        palette: {
            'M': '#5A5550',
            'L': '#6A6560',
            'V': '#4A4540'   // Subtle marble veins
        }
    },

    // MARBLE FLOOR - Variant 2
    marble_floor_v2: {
        name: 'marble_floor_v2',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "LLLLMMMMMLLLLMMM",
            "LLLLLMMMMLVLLLMM",
            "LLLLLLMMMLLLLLLM",
            "MLLLLLLMMLLLVLLL",
            "MMLLLLLLLLLLLLLM",
            "MMMLLLVLLLLLLLMM",
            "MMMMLLLLLLLLLMMM",
            "LLMMMLLLLLLLMMMM",
            "LLLMMMLLVLMMMMMM",
            "LLLLLMMLLLMMMMML",
            "MLLLLLLLLMMMMLLL",
            "MMLLVLLLMMMLLLLL",
            "MMMLLLLLMMLLLLLM",
            "MMMMLLLLLLVLLLMM",
            "LMMMMLLLLLLLLMMM",
            "LLMMMMLLLLLMMMMM"
        ],
        palette: {
            'M': '#555048',
            'L': '#656058',
            'V': '#454038'
        }
    },

    // MARBLE FLOOR - Gold variant 1
    marble_floor_gold: {
        name: 'marble_floor_gold',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "MMMLLLLMMMGLLLMM",
            "MMLLLLLLMMLLLLMM",
            "MLLLLLLLMLLLLLML",
            "LLLLMMLLLLLGMLLL",
            "LLLMMMMLLLLMMMLM",
            "MLMMMMMMLGLMMMLL",
            "MMMMMMLLLLLMMMLL",
            "MMMMLLLLLLLMMLGL",
            "MMLLLLLLLLLLLLLL",
            "MLGLLGMLLLLLLLLM",
            "LLLLLMMMLLLLLMMM",
            "LLLLMMMMMLLLLMMM",
            "LLLMMMMMMGLLLMMM",
            "LLMMMMLLLMMLMMMM",
            "LMMMLLLLLLMLLLMM",
            "MMMLLLLGLLLLLLLM"
        ],
        palette: {
            'M': '#5A5550',
            'L': '#6A6560',
            'G': '#AA9050'   // Subtle gold inlay
        }
    },

    // MARBLE FLOOR - Gold variant 2
    marble_floor_gold_v2: {
        name: 'marble_floor_gold_v2',
        width: 16,
        height: 16,
        walkable: true,
        type: 'floor',
        pixels: [
            "LLLLMMMMMLLLLMMM",
            "LGLLGMMMMLLLLLMM",
            "LLLLLLMMMLLLLLLM",
            "MLLLLLLMMLLGLLLL",
            "MMLLLLLLLLLLLLLM",
            "MMMLLLLLLLLLLLMM",
            "MMMMLLLGLLLLGMMM",
            "LLMMMLLLLLLLMMMM",
            "LLLMMMLLLLMMMMMM",
            "LLLLLMMLLLMMMGML",
            "MLLLLLLLLMMMMLLL",
            "MMLLLLLLMMMLLLGL",
            "MMMLLLLLMMLLLLLM",
            "MMMGLLLLLLLLLLMM",
            "LMMMMLLLLLLLLMMM",
            "LLMMMMLGLLLMMMMM"
        ],
        palette: {
            'M': '#555048',
            'L': '#656058',
            'G': '#998848'
        }
    },

    temple_wall: {
        name: 'temple_wall',
        width: 16,
        height: 16,
        walkable: false,
        type: 'wall',
        pixels: [
            "GGGGGGGGGGGGGGGG",
            "HHHHHHHHHHHHHHHH",
            "LLLLLLLLLLLLLLLL",
            "LMMMMMMMMMMMMMML",
            "LMDDDDDDDDDDDML",
            "LMDDDDDDDDDDDML",
            "LMDDDGGGGDDDML",
            "LMDDDGGGGDDDML",
            "LMDDDGGGGDDDML",
            "LMDDDGGGGDDDML",
            "LMDDDDDDDDDDDML",
            "LMDDDDDDDDDDDML",
            "LMMMMMMMMMMMMMML",
            "LLLLLLLLLLLLLLLL",
            "MMMMMMMMMMMMMMMM",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'G': '#FFDD77',  // Gold trim
            'H': '#8A857A',
            'L': '#6A655A',
            'M': '#4A4540',
            'D': '#2A2520',
            'S': '#1A1510'
        }
    },

    // ========================================================================
    // SPECIAL / INTERACTIVE TILES
    // ========================================================================

    door_closed: {
        name: 'door_closed',
        width: 16,
        height: 16,
        walkable: false,
        type: 'door',
        state: 'closed',
        pixels: [
            "SSSSSSSSSSSSSSSS",
            "SWWWWWWWWWWWWWWS",
            "SWDDDDDDDDDDDDWS",
            "SWDWWWWWWWWWDWS",
            "SWDWDDDDDDWDWS",
            "SWDWDDDDDDWDWS",
            "SWDWDDDDDDWDWS",
            "SWDWDDDDHHWDWS",
            "SWDWDDDDHHWDWS",
            "SWDWDDDDDDWDWS",
            "SWDWDDDDDDWDWS",
            "SWDWDDDDDDWDWS",
            "SWDWWWWWWWWDWS",
            "SWDDDDDDDDDDDDWS",
            "SWWWWWWWWWWWWWWS",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'S': '#101010',  // Shadow/frame
            'W': '#4A3728',  // Wood frame
            'D': '#5C4033',  // Door wood
            'H': '#888888'   // Handle
        }
    },

    door_open: {
        name: 'door_open',
        width: 16,
        height: 16,
        walkable: true,
        type: 'door',
        state: 'open',
        pixels: [
            "SSSSSSSSSSSSSSSS",
            "SWWWW......WWWWS",
            "SWD..........DWS",
            "SWD..........DWS",
            "SWD..........DWS",
            "SWD..........DWS",
            "SWD..........DWS",
            "SWD..........DWS",
            "SWD..........DWS",
            "SWD..........DWS",
            "SWD..........DWS",
            "SWD..........DWS",
            "SWD..........DWS",
            "SWD..........DWS",
            "SWWWW......WWWWS",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'S': '#101010',
            'W': '#4A3728',
            'D': '#5C4033',
            '.': '#1A1A1A'   // Open space (shows floor)
        }
    },

    stairs_down: {
        name: 'stairs_down',
        width: 16,
        height: 16,
        walkable: true,
        type: 'stairs',
        direction: 'down',
        pixels: [
            "SSSSSSSSSSSSSSSS",
            "S11111111111111S",
            "S11111111111111S",
            "SS2222222222222S",
            "SS2222222222222S",
            "SSS333333333333S",
            "SSS333333333333S",
            "SSSS44444444444S",
            "SSSS44444444444S",
            "SSSSS5555555555S",
            "SSSSS5555555555S",
            "SSSSSS666666666S",
            "SSSSSS666666666S",
            "SSSSSSS77777777S",
            "SSSSSSS77777777S",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'S': '#101010',  // Shadow/void
            '1': '#3A3A3A',  // Step 1 (lightest)
            '2': '#333333',
            '3': '#2C2C2C',
            '4': '#252525',
            '5': '#1E1E1E',
            '6': '#171717',
            '7': '#101010'   // Step 7 (darkest)
        }
    },

    stairs_up: {
        name: 'stairs_up',
        width: 16,
        height: 16,
        walkable: true,
        type: 'stairs',
        direction: 'up',
        pixels: [
            "SSSSSSSSSSSSSSSS",
            "S77777777SSSSSSS",
            "S77777777SSSSSSS",
            "S666666666SSSSSS",
            "S666666666SSSSSS",
            "S5555555555SSSSS",
            "S5555555555SSSSS",
            "S44444444444SSSS",
            "S44444444444SSSS",
            "S333333333333SSS",
            "S333333333333SSS",
            "S2222222222222SS",
            "S2222222222222SS",
            "S11111111111111S",
            "S11111111111111S",
            "SSSSSSSSSSSSSSSS"
        ],
        palette: {
            'S': '#101010',
            '1': '#3A3A3A',
            '2': '#404040',
            '3': '#464646',
            '4': '#4C4C4C',
            '5': '#525252',
            '6': '#585858',
            '7': '#5E5E5E'   // Brightest (exit light)
        }
    },

    pressure_plate: {
        name: 'pressure_plate',
        width: 16,
        height: 16,
        walkable: true,
        type: 'interactive',
        pixels: [
            "DDDDDDDDDDDDDDDD",
            "DMMMMMMMMMMMMMD",
            "DMPPPPPPPPPPPPMD",
            "DMPHHHHHHHHHHPMD",
            "DMPHHHHHHHHHHPMD",
            "DMPHHHHHHHHHHPMD",
            "DMPHHHHHHHHHHPMD",
            "DMPHHHHHHHHHHPMD",
            "DMPHHHHHHHHHHPMD",
            "DMPHHHHHHHHHHPMD",
            "DMPHHHHHHHHHHPMD",
            "DMPHHHHHHHHHHPMD",
            "DMPHHHHHHHHHHPMD",
            "DMPPPPPPPPPPPPMD",
            "DMMMMMMMMMMMMMD",
            "DDDDDDDDDDDDDDDD"
        ],
        palette: {
            'D': '#1A1A1A',
            'M': '#2A2A2A',
            'P': '#444444',  // Plate edge
            'H': '#555555'   // Plate surface (highlighted)
        }
    },

    chest_closed: {
        name: 'chest_closed',
        width: 16,
        height: 16,
        walkable: false,
        type: 'interactive',
        pixels: [
            "................",
            "................",
            "................",
            "................",
            "..WWWWWWWWWWWW..",
            "..WLLLLLLLLLLW..",
            "..WLMMMMMMMMLW..",
            "..WLMMMGGMMMLW..",
            "..WWWWWGGWWWWW..",
            "..WDDDDDDDDDW..",
            "..WDMMMMMMMMDW..",
            "..WDMMMMMMMMDW..",
            "..WDMMMMMMMMDW..",
            "..WDDDDDDDDDDW..",
            "..WWWWWWWWWWWW..",
            "................"
        ],
        palette: {
            '.': '#1A1A1A',  // Transparent/floor
            'W': '#4A3728',  // Wood dark
            'L': '#6B5540',  // Lid wood
            'M': '#5C4033',  // Mid wood
            'D': '#3A2818',  // Body dark
            'G': '#FFDD77'   // Gold clasp
        }
    },

    // ========================================================================
    // WATER TILES
    // ========================================================================

    shallow_water: {
        name: 'shallow_water',
        width: 16,
        height: 16,
        walkable: true,
        type: 'hazard',
        hazard: 'slow',
        animated: true,
        pixels: [
            "WWWWWWWWWWWWWWWW",
            "WLLLLWWWLLLLWWWL",
            "WLHHLWWWLHHLWWWL",
            "WLLLLWWWLLLLWWWL",
            "WWWWWWWWWWWWWWWW",
            "WWWLLLLWWWLLLLWW",
            "WWWLHHLWWWLHHLWW",
            "WWWLLLLWWWLLLLWW",
            "WWWWWWWWWWWWWWWW",
            "WLLLLWWWLLLLWWWL",
            "WLHHLWWWLHHLWWWL",
            "WLLLLWWWLLLLWWWL",
            "WWWWWWWWWWWWWWWW",
            "WWWLLLLWWWLLLLWW",
            "WWWLHHLWWWLHHLWW",
            "WWWLLLLWWWLLLLWW"
        ],
        palette: {
            'W': '#4488BB',  // Water base
            'L': '#5599CC',  // Light ripple
            'H': '#66AADD'   // Highlight
        }
    },

    deep_water: {
        name: 'deep_water',
        width: 16,
        height: 16,
        walkable: false,
        type: 'hazard',
        animated: true,
        pixels: [
            "DDDDDDDDDDDDDDDD",
            "DWWWWDDDWWWWDDDD",
            "DWLLWDDDWLLWDDDD",
            "DWWWWDDDWWWWDDDD",
            "DDDDDDDDDDDDDDDD",
            "DDDWWWWDDDWWWWDD",
            "DDDWLLWDDDWLLWDD",
            "DDDWWWWDDDWWWWDD",
            "DDDDDDDDDDDDDDDD",
            "DWWWWDDDWWWWDDDD",
            "DWLLWDDDWLLWDDDD",
            "DWWWWDDDWWWWDDDD",
            "DDDDDDDDDDDDDDDD",
            "DDDWWWWDDDWWWWDD",
            "DDDWLLWDDDWLLWDD",
            "DDDWWWWDDDWWWWDD"
        ],
        palette: {
            'D': '#223355',  // Deep water
            'W': '#2255AA',  // Wave
            'L': '#4488BB'   // Wave highlight
        }
    }
};

// ============================================================================
// THEME-BASED TILE SELECTION
// ============================================================================
// Integration with tile-theme-config.js for room-based tile rendering

/**
 * Get a tile sprite for a specific room theme and tile type
 * @param {string} roomTheme - Room theme name (e.g., 'volcanic_chamber', 'ice_cave')
 * @param {string} tileType - Type of tile: 'floor', 'wall', 'corner', 'hazard'
 * @param {number} x - Grid X position (for variation)
 * @param {number} y - Grid Y position (for variation)
 * @param {string} cornerPosition - For corners: 'nw', 'ne', 'sw', 'se'
 * @returns {Object|null} Tile sprite definition or null
 */
function getTileForTheme(roomTheme, tileType, x = 0, y = 0, cornerPosition = null) {
    // Requires tile-theme-config.js to be loaded
    if (typeof getTileThemeConfig !== 'function') {
        console.warn('[TileRenderer] tile-theme-config.js not loaded, using default tiles');
        return TILE_SPRITES.stone_floor;
    }

    if (tileType === 'floor') {
        const tileName = getFloorTileNameForTheme(roomTheme, x, y);
        return TILE_SPRITES[tileName] || TILE_SPRITES.stone_floor;
    }

    if (tileType === 'wall') {
        const tileName = getWallTileNameForTheme(roomTheme, x, y);
        return TILE_SPRITES[tileName] || TILE_SPRITES.brick_wall;
    }

    if (tileType === 'corner' && cornerPosition) {
        const tileName = getCornerTileNameForTheme(roomTheme, cornerPosition);
        return TILE_SPRITES[tileName] || TILE_SPRITES.brick_wall;
    }

    if (tileType === 'hazard') {
        const tileName = getHazardTileForTheme(roomTheme);
        return tileName ? TILE_SPRITES[tileName] : null;
    }

    return null;
}

/**
 * Get corridor tile (always uses neutral dungeon theme)
 * @param {string} tileType - 'floor' or 'wall'
 * @param {number} x - Grid X position
 * @param {number} y - Grid Y position
 * @returns {Object} Tile sprite definition
 */
function getCorridorTile(tileType, x = 0, y = 0) {
    if (typeof getCorridorTileTheme !== 'function') {
        return tileType === 'wall' ? TILE_SPRITES.stone_wall : TILE_SPRITES.stone_floor;
    }

    const config = getCorridorTileTheme();

    if (tileType === 'wall') {
        return TILE_SPRITES[config.wall] || TILE_SPRITES.stone_wall;
    }

    // Floor with variation
    const variants = config.floorVariants || [config.floor];
    const index = Math.abs((x * 7 + y * 11) % variants.length);
    return TILE_SPRITES[variants[index]] || TILE_SPRITES.stone_floor;
}

/**
 * Draw a procedural tile at screen position
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} tile - Tile sprite definition
 * @param {number} screenX - Screen X position
 * @param {number} screenY - Screen Y position
 * @param {number} size - Target tile size in pixels
 * @param {Object} options - Optional rendering options (palette override, etc.)
 */
function drawProceduralTile(ctx, tile, screenX, screenY, size, options = {}) {
    if (!tile) return;

    // Calculate scale based on target size and tile's native size (16x16)
    const scale = size / TileRenderer.TILE_SIZE;

    TileRenderer.draw(ctx, tile, screenX, screenY, scale, options);
}

/**
 * Draw themed floor tile at position
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} roomTheme - Room theme name
 * @param {number} gridX - Grid X position
 * @param {number} gridY - Grid Y position
 * @param {number} screenX - Screen X position
 * @param {number} screenY - Screen Y position
 * @param {number} size - Tile size in pixels
 */
function drawThemedFloorTile(ctx, roomTheme, gridX, gridY, screenX, screenY, size) {
    const tile = getTileForTheme(roomTheme, 'floor', gridX, gridY);
    drawProceduralTile(ctx, tile, screenX, screenY, size);
}

/**
 * Draw themed wall tile at position
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} roomTheme - Room theme name
 * @param {number} gridX - Grid X position
 * @param {number} gridY - Grid Y position
 * @param {number} screenX - Screen X position
 * @param {number} screenY - Screen Y position
 * @param {number} size - Tile size in pixels
 */
function drawThemedWallTile(ctx, roomTheme, gridX, gridY, screenX, screenY, size) {
    const tile = getTileForTheme(roomTheme, 'wall', gridX, gridY);
    drawProceduralTile(ctx, tile, screenX, screenY, size);
}

/**
 * Draw themed corner tile at position
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} roomTheme - Room theme name
 * @param {string} cornerPosition - 'nw', 'ne', 'sw', 'se'
 * @param {number} screenX - Screen X position
 * @param {number} screenY - Screen Y position
 * @param {number} size - Tile size in pixels
 */
function drawThemedCornerTile(ctx, roomTheme, cornerPosition, screenX, screenY, size) {
    const tile = getTileForTheme(roomTheme, 'corner', 0, 0, cornerPosition);
    drawProceduralTile(ctx, tile, screenX, screenY, size);
}

/**
 * Draw corridor floor tile
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} gridX - Grid X position
 * @param {number} gridY - Grid Y position
 * @param {number} screenX - Screen X position
 * @param {number} screenY - Screen Y position
 * @param {number} size - Tile size in pixels
 */
function drawCorridorFloorTile(ctx, gridX, gridY, screenX, screenY, size) {
    const tile = getCorridorTile('floor', gridX, gridY);
    drawProceduralTile(ctx, tile, screenX, screenY, size);
}

/**
 * Draw corridor wall tile
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} gridX - Grid X position
 * @param {number} gridY - Grid Y position
 * @param {number} screenX - Screen X position
 * @param {number} screenY - Screen Y position
 * @param {number} size - Tile size in pixels
 */
function drawCorridorWallTile(ctx, gridX, gridY, screenX, screenY, size) {
    const tile = getCorridorTile('wall', gridX, gridY);
    drawProceduralTile(ctx, tile, screenX, screenY, size);
}

// ============================================================================
// TILE HELPER FUNCTIONS
// ============================================================================

/**
 * Get all tiles of a specific type
 */
function getTilesByType(type) {
    return Object.entries(TILE_SPRITES)
        .filter(([name, tile]) => tile.type === type)
        .reduce((acc, [name, tile]) => {
            acc[name] = tile;
            return acc;
        }, {});
}

/**
 * Get all tiles for an environment theme
 */
function getTilesByEnvironment(environment) {
    const prefix = environment + '_';
    const results = {};

    for (const [name, tile] of Object.entries(TILE_SPRITES)) {
        if (name.startsWith(prefix) || name.includes(environment)) {
            results[name] = tile;
        }
    }

    return results;
}

/**
 * Get a random tile variant
 */
function getRandomTileVariant(baseName) {
    const variants = Object.keys(TILE_SPRITES).filter(name =>
        name.startsWith(baseName)
    );

    if (variants.length === 0) return null;
    return TILE_SPRITES[variants[Math.floor(Math.random() * variants.length)]];
}

// ============================================================================
// EXPORTS
// ============================================================================

window.TileRenderer = TileRenderer;
window.TILE_SPRITES = TILE_SPRITES;
window.TILE_PALETTES = TILE_PALETTES;
window.getTilesByType = getTilesByType;
window.getTilesByEnvironment = getTilesByEnvironment;
window.getRandomTileVariant = getRandomTileVariant;

// Theme-based tile functions (require tile-theme-config.js)
window.getTileForTheme = getTileForTheme;
window.getCorridorTile = getCorridorTile;
window.drawProceduralTile = drawProceduralTile;
window.drawThemedFloorTile = drawThemedFloorTile;
window.drawThemedWallTile = drawThemedWallTile;
window.drawThemedCornerTile = drawThemedCornerTile;
window.drawCorridorFloorTile = drawCorridorFloorTile;
window.drawCorridorWallTile = drawCorridorWallTile;

console.log('[TileRenderer] Loaded with', Object.keys(TILE_SPRITES).length, 'tile definitions');
