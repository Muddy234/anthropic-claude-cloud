// ============================================================================
// MINI-MAP - CotDG Inspired Circular Radar
// ============================================================================
// Circular radar-style minimap with dark atmosphere and glowing entities
// Performance optimized with offscreen canvas caching for explored terrain
// ============================================================================

// Mini-map configuration
const MINIMAP_CONFIG = {
    size: 160,              // Diameter
    padding: 20,            // Distance from edges
    tileRadius: 18,         // How many tiles to show
    tileSize: 4,            // Size of each tile on minimap
    borderWidth: 3,
    innerRingRadius: 0.65,  // Inner circle at 65% radius
    scanLineSpeed: 0.002,   // Rotating scan line speed
    pulseSpeed: 0.003       // Entity pulse speed
};

// Animation state
window.minimapState = {
    scanAngle: 0,
    pulsePhase: 0
};

// =============================================================================
// MINIMAP CACHE SYSTEM - Issue #6 Performance Optimization
// =============================================================================
// Caches explored terrain to offscreen canvas, only redraws entities each frame
// =============================================================================

const MinimapCache = {
    // Offscreen canvas for terrain
    terrainCanvas: null,
    terrainCtx: null,

    // Track what we've cached
    cachedPlayerX: null,
    cachedPlayerY: null,
    cachedExploredCount: 0,

    // Dirty flag - when true, terrain needs full redraw
    isDirty: true,

    // Frame counter for periodic refresh (handles edge cases)
    frameCount: 0,
    REFRESH_INTERVAL: 60, // Full refresh every 60 frames (1 second at 60fps)

    /**
     * Initialize the offscreen canvas
     */
    init() {
        if (this.terrainCanvas) return; // Already initialized

        const cfg = MINIMAP_CONFIG;
        this.terrainCanvas = document.createElement('canvas');
        this.terrainCanvas.width = cfg.size;
        this.terrainCanvas.height = cfg.size;
        this.terrainCtx = this.terrainCanvas.getContext('2d');

        console.log('[MinimapCache] Initialized offscreen canvas for terrain caching');
    },

    /**
     * Check if cache needs to be invalidated
     */
    checkDirty(playerGridX, playerGridY) {
        // Player moved - cache is dirty
        if (this.cachedPlayerX !== playerGridX || this.cachedPlayerY !== playerGridY) {
            this.isDirty = true;
            this.cachedPlayerX = playerGridX;
            this.cachedPlayerY = playerGridY;
            return true;
        }

        // Count explored tiles (simple heuristic - if count changes, exploration happened)
        let exploredCount = 0;
        if (game.map) {
            const cfg = MINIMAP_CONFIG;
            const startX = Math.max(0, playerGridX - cfg.tileRadius);
            const endX = Math.min(game.map[0]?.length || 0, playerGridX + cfg.tileRadius);
            const startY = Math.max(0, playerGridY - cfg.tileRadius);
            const endY = Math.min(game.map.length, playerGridY + cfg.tileRadius);

            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    if (game.map[y]?.[x]?.explored) exploredCount++;
                }
            }
        }

        if (exploredCount !== this.cachedExploredCount) {
            this.isDirty = true;
            this.cachedExploredCount = exploredCount;
            return true;
        }

        // Periodic refresh (handles edge cases like visibility changes)
        this.frameCount++;
        if (this.frameCount >= this.REFRESH_INTERVAL) {
            this.frameCount = 0;
            this.isDirty = true;
            return true;
        }

        return false;
    },

    /**
     * Mark cache as dirty (call when map structure changes)
     */
    invalidate() {
        this.isDirty = true;
    },

    /**
     * Render terrain to offscreen canvas
     */
    renderTerrain(centerX, centerY, radius, playerGridX, playerGridY, colors) {
        if (!this.terrainCtx) this.init();

        const ctx = this.terrainCtx;
        const cfg = MINIMAP_CONFIG;

        // Clear offscreen canvas
        ctx.clearRect(0, 0, cfg.size, cfg.size);

        // Local center (offscreen canvas is centered at size/2)
        const localCenterX = cfg.size / 2;
        const localCenterY = cfg.size / 2;

        // Clip to circular region
        ctx.save();
        ctx.beginPath();
        ctx.arc(localCenterX, localCenterY, radius - 2, 0, Math.PI * 2);
        ctx.clip();

        // Background gradient
        const bgGrad = ctx.createRadialGradient(localCenterX, localCenterY, 0, localCenterX, localCenterY, radius);
        bgGrad.addColorStop(0, colors.bgDark || '#12121a');
        bgGrad.addColorStop(0.7, colors.bgDarkest || '#0a0a0f');
        bgGrad.addColorStop(1, '#000000');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, cfg.size, cfg.size);

        // Grid lines
        drawMinimapGridToContext(ctx, localCenterX, localCenterY, radius, colors);

        // Calculate tile range
        const startX = Math.max(0, playerGridX - cfg.tileRadius);
        const endX = Math.min(game.map[0]?.length || 0, playerGridX + cfg.tileRadius);
        const startY = Math.max(0, playerGridY - cfg.tileRadius);
        const endY = Math.min(game.map.length, playerGridY + cfg.tileRadius);

        // Draw tiles
        for (let mapY = startY; mapY < endY; mapY++) {
            for (let mapX = startX; mapX < endX; mapX++) {
                const tile = game.map[mapY]?.[mapX];
                if (!tile) continue;

                const relX = mapX - playerGridX;
                const relY = mapY - playerGridY;
                const minimapX = localCenterX + (relX * cfg.tileSize);
                const minimapY = localCenterY + (relY * cfg.tileSize);

                const distFromCenter = Math.sqrt(relX * relX + relY * relY) * cfg.tileSize;
                if (distFromCenter > radius - 5) continue;

                drawMinimapTileCotDG(ctx, minimapX, minimapY, cfg.tileSize, tile, colors);
            }
        }

        ctx.restore();

        this.isDirty = false;
    },

    /**
     * Get the cached terrain canvas
     */
    getTerrainCanvas() {
        return this.terrainCanvas;
    }
};

/**
 * Draw grid lines to a specific context (used by cache)
 */
function drawMinimapGridToContext(ctx, cx, cy, radius, colors) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Concentric circles
    for (let r = 0.33; r < 1; r += 0.33) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Cross lines
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();
}

// Export cache for external invalidation
window.MinimapCache = MinimapCache;

/**
 * Render the mini-map - CotDG style circular radar
 * OPTIMIZED: Uses offscreen canvas caching for terrain (Issue #6)
 */
function renderMiniMap(ctx, canvasWidth) {
    if (!game.player || !game.map) return;

    const cfg = MINIMAP_CONFIG;

    // Get colors from design system (updated to warm charcoal palette)
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDarkest: '#0d0d0d',
        bgDark: '#141414',
        border: '#3a3530',
        corruption: '#6b3a7d',
        health: '#a82828',
        gold: '#c9a227',
        xp: '#8fafc4',
        textMuted: '#706850',
        textPrimary: '#efe4b0'
    };

    const centerX = canvasWidth - cfg.size / 2 - cfg.padding;
    const centerY = cfg.size / 2 + cfg.padding;
    const radius = cfg.size / 2;

    // Update animation state
    window.minimapState.scanAngle += cfg.scanLineSpeed * 16; // Assume ~60fps
    window.minimapState.pulsePhase += cfg.pulseSpeed * 16;

    // Calculate center tile (player position)
    const playerGridX = Math.floor(game.player.gridX);
    const playerGridY = Math.floor(game.player.gridY);

    // === CACHED TERRAIN RENDERING (Issue #6 Optimization) ===
    // Initialize cache if needed
    MinimapCache.init();

    // Check if terrain cache needs refresh
    MinimapCache.checkDirty(playerGridX, playerGridY);

    // Render terrain to cache if dirty
    if (MinimapCache.isDirty) {
        MinimapCache.renderTerrain(centerX, centerY, radius, playerGridX, playerGridY, colors);
    }

    // Draw cached terrain to main canvas
    const terrainCanvas = MinimapCache.getTerrainCanvas();
    if (terrainCanvas) {
        ctx.drawImage(terrainCanvas, centerX - radius, centerY - radius);
    }

    ctx.save();

    // === CLIP TO CIRCULAR REGION (for entities) ===
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
    ctx.clip();

    // === DRAW ENTITIES (always fresh each frame) ===
    drawMinimapEntities(ctx, centerX, centerY, cfg, playerGridX, playerGridY, colors);

    // === PLAYER MARKER (always centered) ===
    drawPlayerMarker(ctx, centerX, centerY, cfg, colors);

    ctx.restore();

    // === OUTER FRAME (not clipped) ===
    drawMinimapFrame(ctx, centerX, centerY, radius, cfg, colors);

    // === COMPASS / LABELS ===
    drawMinimapCompass(ctx, centerX, centerY, radius, colors);
}

/**
 * Draw subtle grid lines
 */
function drawMinimapGrid(ctx, cx, cy, radius, colors) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Concentric circles
    for (let r = 0.33; r < 1; r += 0.33) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Cross lines
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();
}

/**
 * Draw a single tile on the minimap - CotDG style
 * Now shows ALL tiles - unexplored tiles are dimmed but visible
 */
function drawMinimapTileCotDG(ctx, x, y, size, tile, colors) {
    // Determine alpha based on exploration state
    // - Explored + visible: full brightness
    // - Explored + not visible: 40% brightness
    // - Unexplored: minimum brightness (same as far explored tiles)
    const MIN_BRIGHTNESS = 0.55;
    let alpha;
    if (tile.explored) {
        alpha = tile.visible ? 1.0 : 0.4;
    } else {
        // Unexplored tiles are visible but heavily dimmed
        alpha = MIN_BRIGHTNESS * 0.4; // Extra dim for mini-map
    }
    ctx.globalAlpha = alpha;

    // Floor types
    if (tile.type === 'floor') {
        if (tile.corridor) {
            ctx.fillStyle = '#1a1a24';
        } else {
            ctx.fillStyle = '#252530';
        }
        ctx.fillRect(x - size/2, y - size/2, size, size);
    }
    // Walls
    else if (tile.type === 'wall' || tile.type === 'interior_wall') {
        ctx.fillStyle = '#4a4a5a';
        ctx.fillRect(x - size/2, y - size/2, size, size);
    }
    // Legacy exit tile - render as regular floor
    else if (tile.type === 'exit') {
        ctx.fillStyle = '#28283a';  // Same as floor
        ctx.fillRect(x - size/2, y - size/2, size, size);
    }
    // Doorway
    else if (tile.type === 'doorway') {
        ctx.fillStyle = '#333340';
        ctx.fillRect(x - size/2, y - size/2, size, size);
    }

    ctx.globalAlpha = 1;
}

/**
 * Draw entities (enemies, loot, NPCs, descent markers)
 */
function drawMinimapEntities(ctx, cx, cy, cfg, playerGridX, playerGridY, colors) {
    const pulse = Math.sin(window.minimapState.pulsePhase) * 0.3 + 0.7;
    const radius = cfg.size / 2;

    // Draw path down / descent location (purple)
    let descentX = null, descentY = null;
    let descentRevealed = false;

    if (typeof sessionState !== 'undefined' && sessionState.pathDown) {
        const pd = sessionState.pathDown;
        if (pd.x !== null && pd.y !== null) {
            descentX = pd.x;
            descentY = pd.y;
            descentRevealed = pd.revealed || pd.discovered;
        }
    }
    if (descentX === null && typeof game !== 'undefined' && game.exitPosition) {
        descentX = game.exitPosition.x;
        descentY = game.exitPosition.y;
        descentRevealed = true;
    }

    if (descentX !== null && descentY !== null) {
        // Check if tile is explored - only show if player has discovered it
        const descentTile = game.map[descentY]?.[descentX];
        const tileExplored = descentTile?.explored || false;

        // Only show descent if tile is explored OR explicitly revealed
        if (tileExplored || descentRevealed) {
            const dx = descentX - playerGridX;
            const dy = descentY - playerGridY;
            const dist = Math.sqrt(dx * dx + dy * dy) * cfg.tileSize;

            if (dist <= radius - 5) {
                const minimapX = cx + (dx * cfg.tileSize);
                const minimapY = cy + (dy * cfg.tileSize);

                ctx.save();

                // Bright magenta for descent
                ctx.shadowColor = '#ff00ff';
                ctx.shadowBlur = 10;
                ctx.fillStyle = '#ff00ff';
                ctx.globalAlpha = pulse;
                ctx.beginPath();
                ctx.arc(minimapX, minimapY, cfg.tileSize * 1.5, 0, Math.PI * 2);
                ctx.fill();

                // Down arrow indicator
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 1;
                ctx.beginPath();
                ctx.moveTo(minimapX, minimapY + cfg.tileSize * 2.5);
                ctx.lineTo(minimapX - cfg.tileSize * 0.6, minimapY + cfg.tileSize * 1.5);
                ctx.lineTo(minimapX + cfg.tileSize * 0.6, minimapY + cfg.tileSize * 1.5);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }
        }
    }

    // Draw enemies
    if (game.enemies) {
        for (const enemy of game.enemies) {
            if (enemy.hp <= 0) continue;

            const enemyX = Math.floor(enemy.gridX);
            const enemyY = Math.floor(enemy.gridY);

            const dx = enemyX - playerGridX;
            const dy = enemyY - playerGridY;
            const dist = Math.sqrt(dx * dx + dy * dy) * cfg.tileSize;

            if (dist > radius - 5) continue;

            const tile = game.map[enemyY]?.[enemyX];
            if (!tile) continue;

            const minimapX = cx + (dx * cfg.tileSize);
            const minimapY = cy + (dy * cfg.tileSize);

            // Get brightness - explored tiles use distance-based, unexplored use minimum
            const MIN_BRIGHTNESS = 0.55;
            let brightness;
            if (tile.explored) {
                brightness = typeof getTileBrightness === 'function' ? getTileBrightness(enemyX, enemyY) : 1.0;
            } else {
                brightness = MIN_BRIGHTNESS;
            }
            ctx.globalAlpha = brightness;

            // Enemy dot with glow
            ctx.shadowColor = colors.health || '#c0392b';
            ctx.shadowBlur = 4;
            ctx.fillStyle = colors.health || '#c0392b';
            ctx.beginPath();
            ctx.arc(minimapX, minimapY, cfg.tileSize * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
    }

    // Draw loot
    if (game.loot) {
        for (const lootPile of game.loot) {
            const lootX = Math.floor(lootPile.x);
            const lootY = Math.floor(lootPile.y);

            const dx = lootX - playerGridX;
            const dy = lootY - playerGridY;
            const dist = Math.sqrt(dx * dx + dy * dy) * cfg.tileSize;

            if (dist > radius - 5) continue;

            const tile = game.map[lootY]?.[lootX];
            if (!tile) continue;

            // Get brightness - explored tiles use distance-based, unexplored use minimum
            const MIN_BRIGHTNESS = 0.55;
            let brightness;
            if (tile.explored) {
                brightness = typeof getTileBrightness === 'function' ? getTileBrightness(lootX, lootY) : 1.0;
            } else {
                brightness = MIN_BRIGHTNESS;
            }

            const minimapX = cx + (dx * cfg.tileSize);
            const minimapY = cy + (dy * cfg.tileSize);

            // Loot diamond with pulse (dimmed by brightness)
            ctx.fillStyle = colors.gold || '#d4af37';
            ctx.globalAlpha = pulse * brightness;
            ctx.save();
            ctx.translate(minimapX, minimapY);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-cfg.tileSize * 0.5, -cfg.tileSize * 0.5, cfg.tileSize, cfg.tileSize);
            ctx.restore();
            ctx.globalAlpha = 1;
        }
    }

    // Draw chests
    if (game.chests) {
        for (const chest of game.chests) {
            if (chest.opened) continue;

            const chestX = Math.floor(chest.x);
            const chestY = Math.floor(chest.y);

            const dx = chestX - playerGridX;
            const dy = chestY - playerGridY;
            const dist = Math.sqrt(dx * dx + dy * dy) * cfg.tileSize;

            if (dist > radius - 5) continue;

            const tile = game.map[chestY]?.[chestX];
            if (!tile) continue;

            // Get brightness - explored tiles use distance-based, unexplored use minimum
            const MIN_BRIGHTNESS = 0.55;
            let brightness;
            if (tile.explored) {
                brightness = typeof getTileBrightness === 'function' ? getTileBrightness(chestX, chestY) : 1.0;
            } else {
                brightness = MIN_BRIGHTNESS;
            }
            ctx.globalAlpha = brightness;

            const minimapX = cx + (dx * cfg.tileSize);
            const minimapY = cy + (dy * cfg.tileSize);

            // Chest square with gold border
            ctx.strokeStyle = colors.gold || '#d4af37';
            ctx.lineWidth = 1;
            ctx.strokeRect(minimapX - cfg.tileSize * 0.6, minimapY - cfg.tileSize * 0.6,
                          cfg.tileSize * 1.2, cfg.tileSize * 1.2);
            ctx.globalAlpha = 1;
        }
    }

    // Draw shrines (only if explored)
    if (game.decorations) {
        for (const decoration of game.decorations) {
            if (decoration.type !== 'shrine') continue;
            if (decoration.used) continue; // Skip used shrines

            const shrineX = Math.floor(decoration.x);
            const shrineY = Math.floor(decoration.y);

            const dx = shrineX - playerGridX;
            const dy = shrineY - playerGridY;
            const dist = Math.sqrt(dx * dx + dy * dy) * cfg.tileSize;

            if (dist > radius - 5) continue;

            const tile = game.map[shrineY]?.[shrineX];
            if (!tile) continue;

            // Only show if tile is explored
            if (!tile.explored) continue;

            const minimapX = cx + (dx * cfg.tileSize);
            const minimapY = cy + (dy * cfg.tileSize);

            // Get brightness based on visibility
            const brightness = tile.visible ? 1.0 : 0.6;
            ctx.globalAlpha = brightness;

            // Shrine marker - cyan/teal torii gate style
            ctx.save();
            ctx.shadowColor = '#00ffaa';
            ctx.shadowBlur = 6;
            ctx.fillStyle = '#00ffaa';

            // Draw torii gate shape (simplified)
            const s = cfg.tileSize;
            // Top bar
            ctx.fillRect(minimapX - s * 0.8, minimapY - s * 0.6, s * 1.6, s * 0.3);
            // Two pillars
            ctx.fillRect(minimapX - s * 0.6, minimapY - s * 0.4, s * 0.25, s * 1.0);
            ctx.fillRect(minimapX + s * 0.35, minimapY - s * 0.4, s * 0.25, s * 1.0);

            ctx.restore();
            ctx.globalAlpha = 1;
        }
    }
}

/**
 * Draw player marker at center
 */
function drawPlayerMarker(ctx, cx, cy, cfg, colors) {
    const markerSize = cfg.tileSize * 1.5;

    // Player glow
    ctx.shadowColor = colors.xp || '#5dade2';
    ctx.shadowBlur = 8;

    // Player triangle pointing in facing direction
    ctx.fillStyle = colors.xp || '#5dade2';
    ctx.beginPath();

    // Get facing direction
    let angle = Math.PI / 2; // Default: down
    if (game.player.facing) {
        const fx = game.player.facing.x || 0;
        const fy = game.player.facing.y || 1;
        angle = Math.atan2(fy, fx);
    }

    // Draw triangle pointing in facing direction
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(markerSize, 0);
    ctx.lineTo(-markerSize * 0.5, -markerSize * 0.6);
    ctx.lineTo(-markerSize * 0.5, markerSize * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.shadowBlur = 0;
}

/**
 * Draw minimap frame (border, decorations) - Ornate Occult Compass Style
 */
function drawMinimapFrame(ctx, cx, cy, radius, cfg, colors) {
    // Get design system colors
    const frameGold = typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGold : '#b8860b';
    const frameGoldBright = typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGoldBright : '#daa520';
    const frameGoldDark = typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGoldDark : '#8b6914';

    ctx.save();

    // === OUTER ORNATE FRAME ===
    // Dark stone outer ring
    ctx.strokeStyle = '#1a1816';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    ctx.stroke();

    // Gold border ring (main frame)
    const frameGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    frameGrad.addColorStop(0, frameGoldBright);
    frameGrad.addColorStop(0.3, frameGold);
    frameGrad.addColorStop(0.7, frameGoldDark);
    frameGrad.addColorStop(1, frameGold);
    ctx.strokeStyle = frameGrad;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dark ring
    ctx.strokeStyle = '#0a0908';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle inner glow ring
    ctx.strokeStyle = 'rgba(184, 134, 11, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
    ctx.stroke();

    // === DECORATIVE CORNER FLOURISHES ===
    const cornerDist = radius + 1;
    const flourishSize = 12;

    // Draw ornate diamond markers at cardinal points
    for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI / 2) - Math.PI / 2; // N, E, S, W
        const fx = cx + Math.cos(angle) * cornerDist;
        const fy = cy + Math.sin(angle) * cornerDist;

        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(angle + Math.PI / 2);

        // Outer diamond (gold)
        ctx.fillStyle = frameGold;
        ctx.beginPath();
        ctx.moveTo(0, -flourishSize / 2);
        ctx.lineTo(flourishSize / 3, 0);
        ctx.lineTo(0, flourishSize / 2);
        ctx.lineTo(-flourishSize / 3, 0);
        ctx.closePath();
        ctx.fill();

        // Inner diamond (dark)
        ctx.fillStyle = '#1a1816';
        ctx.beginPath();
        ctx.moveTo(0, -flourishSize / 4);
        ctx.lineTo(flourishSize / 6, 0);
        ctx.lineTo(0, flourishSize / 4);
        ctx.lineTo(-flourishSize / 6, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // === DIAGONAL DECORATIVE NOTCHES ===
    for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI / 2) + Math.PI / 4; // NE, SE, SW, NW
        const nx = cx + Math.cos(angle) * (radius - 2);
        const ny = cy + Math.sin(angle) * (radius - 2);

        ctx.fillStyle = frameGoldDark;
        ctx.beginPath();
        ctx.arc(nx, ny, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // === SCAN LINE (rotating radar effect) ===
    const scanAngle = window.minimapState.scanAngle;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(scanAngle);

    // Gradient for scan line fade
    const scanGrad = ctx.createLinearGradient(0, 0, radius - 8, 0);
    scanGrad.addColorStop(0, 'rgba(142, 68, 173, 0)');
    scanGrad.addColorStop(0.5, 'rgba(142, 68, 173, 0.3)');
    scanGrad.addColorStop(1, 'rgba(142, 68, 173, 0.7)');

    ctx.strokeStyle = scanGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius - 8, 0);
    ctx.stroke();

    // Scan fade trail (wedge)
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = colors.corruption || '#8e44ad';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 8, -0.4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();

    // === CENTRAL RUNE PATTERN (enhanced) ===
    ctx.strokeStyle = 'rgba(184, 134, 11, 0.15)';
    ctx.lineWidth = 1;

    // Inner concentric rings with tick marks
    for (let r = 0.3; r <= 0.6; r += 0.3) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Tick marks around inner ring
    ctx.strokeStyle = 'rgba(184, 134, 11, 0.2)';
    for (let i = 0; i < 8; i++) {
        const tickAngle = (i * Math.PI / 4);
        const innerR = radius * 0.25;
        const outerR = radius * 0.35;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(tickAngle) * innerR, cy + Math.sin(tickAngle) * innerR);
        ctx.lineTo(cx + Math.cos(tickAngle) * outerR, cy + Math.sin(tickAngle) * outerR);
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Draw compass labels - Ornate Gold Cardinal Markers
 */
function drawMinimapCompass(ctx, cx, cy, radius, colors) {
    // Get design system colors
    const frameGold = typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGold : '#b8860b';
    const frameGoldBright = typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGoldBright : '#daa520';
    const textMuted = typeof UI_COLORS !== 'undefined' ? UI_COLORS.textMuted : '#706850';

    const labelDist = radius + 14;

    ctx.save();

    // North indicator (prominent, larger)
    ctx.font = 'bold 11px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // N with glow
    ctx.shadowColor = frameGold;
    ctx.shadowBlur = 4;
    ctx.fillStyle = frameGoldBright;
    ctx.fillText('N', cx, cy - labelDist);
    ctx.shadowBlur = 0;

    // Small arrow above N
    ctx.fillStyle = frameGold;
    ctx.beginPath();
    ctx.moveTo(cx, cy - labelDist - 10);
    ctx.lineTo(cx - 4, cy - labelDist - 5);
    ctx.lineTo(cx + 4, cy - labelDist - 5);
    ctx.closePath();
    ctx.fill();

    // Other cardinals (smaller, more muted)
    ctx.font = 'bold 9px serif';
    ctx.fillStyle = textMuted;

    ctx.fillText('S', cx, cy + labelDist);
    ctx.fillText('E', cx + labelDist, cy);
    ctx.fillText('W', cx - labelDist, cy);

    // Small dots for intercardinal directions
    ctx.fillStyle = 'rgba(184, 134, 11, 0.3)';
    const interDist = labelDist - 4;
    const diagOffset = interDist * 0.707; // cos(45°)

    ctx.beginPath();
    ctx.arc(cx + diagOffset, cy - diagOffset, 2, 0, Math.PI * 2); // NE
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + diagOffset, cy + diagOffset, 2, 0, Math.PI * 2); // SE
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - diagOffset, cy + diagOffset, 2, 0, Math.PI * 2); // SW
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - diagOffset, cy - diagOffset, 2, 0, Math.PI * 2); // NW
    ctx.fill();

    ctx.restore();
}

// Export
window.renderMiniMap = renderMiniMap;
window.MINIMAP_CONFIG = MINIMAP_CONFIG;

console.log('Mini-map loaded (CotDG style)');
