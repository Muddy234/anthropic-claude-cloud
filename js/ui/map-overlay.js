// ============================================================================
// MAP OVERLAY - Full dungeon map view with zoom and pan
// ============================================================================
// Shows entire 200x200 dungeon with fog of war, zoom (1x-8x), and pan controls
// ============================================================================

// Map overlay state
const mapOverlayState = {
    zoom: 1,           // Current zoom level (1x = fit all, up to 8x)
    panX: 0,           // Pan offset X (in tiles)
    panY: 0,           // Pan offset Y (in tiles)
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartPanX: 0,
    dragStartPanY: 0
};

// Map overlay configuration
const MAP_OVERLAY_CONFIG = {
    minZoom: 1,
    maxZoom: 8,
    zoomStep: 0.5,
    // Colors (matching mini-map)
    bgColor: 'rgba(20, 20, 20, 0.95)',
    panelBgColor: '#1a1a1a',
    borderColor: '#3498db',
    wallColor: '#666',
    floorColor: '#2a2a2a',
    corridorColor: '#333',
    unexploredColor: '#000',
    playerColor: '#2980b9',      // Dark blue for player
    enemyColor: '#e74c3c',       // Red for enemies
    lootColor: '#f1c40f',        // Yellow for loot
    exitColor: '#00ffff',        // Cyan for exit
    buttonBgColor: '#333',
    buttonHoverColor: '#444',
    buttonTextColor: '#fff'
};

/**
 * Draw map header with floor info - Section 7.1
 * Shows "CARTOGRAPHIA" title with floor number and dungeon name
 */
function drawMapHeader(ctx, x, y, width) {
    const headerHeight = 50;

    // Get design system colors and fonts
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};
    const fontFamily = typeof UI_FONT_FAMILY !== 'undefined' ? UI_FONT_FAMILY : { display: 'Georgia, serif', body: 'Georgia, serif' };
    const gold = colors.gold || colors.frameGold || '#c9a227';
    const textLight = colors.textPrimary || colors.textLight || '#efe4b0';
    const goldDark = colors.goldDark || colors.frameGoldDark || '#8b6914';

    // Header background
    const gradient = ctx.createLinearGradient(x, y, x, y + headerHeight);
    gradient.addColorStop(0, 'rgba(201, 162, 39, 0.2)');
    gradient.addColorStop(1, 'rgba(13, 13, 13, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, headerHeight);

    // Title
    ctx.fillStyle = gold;
    ctx.font = `bold 20px ${fontFamily.display}`;
    ctx.textAlign = 'center';
    ctx.fillText('CARTOGRAPHIA', x + width / 2, y + 22);

    // Floor indicator
    const floorNum = game.currentFloor || 1;
    ctx.fillStyle = textLight;
    ctx.font = `14px ${fontFamily.body}`;
    ctx.fillText(`Floor ${floorNum} - The Shifting Chasm`, x + width / 2, y + 42);

    // Decorative line
    ctx.strokeStyle = goldDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 40, y + headerHeight - 1);
    ctx.lineTo(x + width - 40, y + headerHeight - 1);
    ctx.stroke();

    return headerHeight;
}

/**
 * Check if a room has been explored by the player - Section 7.2
 * @param {Object} room - Room object with x, y, width, height
 * @returns {boolean} - True if at least one tile in the room has been explored
 */
function isRoomExplored(room) {
    if (!game.exploredTiles) return false;

    // Check if at least one tile in the room has been explored
    for (let x = room.x; x < room.x + room.width; x++) {
        for (let y = room.y; y < room.y + room.height; y++) {
            const key = `${x},${y}`;
            if (game.exploredTiles.has(key)) return true;
        }
    }
    return false;
}

/**
 * Draw room outlines on the map - Section 7.2
 * Shows dashed outlines around explored rooms
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} mapX - Map area left
 * @param {number} mapY - Map area top
 * @param {number} tileSize - Pixel size of each tile
 * @param {number} offsetX - X offset for rendering
 * @param {number} offsetY - Y offset for rendering
 */
function drawRoomOutlines(ctx, mapX, mapY, tileSize, offsetX, offsetY) {
    if (!game.dungeon || !game.dungeon.rooms) return;

    const fontFamily = typeof UI_FONT_FAMILY !== 'undefined' ? UI_FONT_FAMILY : { body: 'Georgia, serif' };

    ctx.save();
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    game.dungeon.rooms.forEach((room, index) => {
        // Only draw if room has been discovered
        const roomExplored = isRoomExplored(room);
        if (!roomExplored) return;

        const rx = offsetX + room.x * tileSize;
        const ry = offsetY + room.y * tileSize;
        const rw = room.width * tileSize;
        const rh = room.height * tileSize;

        ctx.strokeRect(rx, ry, rw, rh);

        // Room number/name if special
        if (room.type && room.type !== 'normal') {
            ctx.fillStyle = 'rgba(201, 162, 39, 0.5)';
            ctx.font = '10px ' + fontFamily.body;
            ctx.textAlign = 'center';
            ctx.fillText(room.type.toUpperCase(), rx + rw / 2, ry + rh / 2);
        }
    });

    ctx.setLineDash([]);
    ctx.restore();
}

/**
 * Draw a mini star shape for the legend - Section 7.3
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} r - Outer radius
 */
function drawMiniStar(ctx, cx, cy, r) {
    const points = 5;
    const inner = r * 0.4;

    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? r : inner;
        const angle = (i * Math.PI / points) - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

/**
 * Draw the map overlay - CotDG Ancient Cartography Style
 */
function drawMapOverlay() {
    const cfg = MAP_OVERLAY_CONFIG;

    // Get design system colors
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};
    const frameGold = colors.frameGold || '#b8860b';
    const frameGoldBright = colors.frameGoldBright || '#daa520';
    const frameGoldDark = colors.frameGoldDark || '#8b6914';
    const parchment = colors.parchmentLight || '#f5e6c8';
    const parchmentDark = colors.parchment || '#d4c4a0';

    // Get panel dimensions - use nearly all available space
    const sidebarWidth = typeof SIDEBAR_CONFIG !== 'undefined' ? SIDEBAR_CONFIG.width : 70;
    const panelPadding = 20;
    const panelX = sidebarWidth + panelPadding;
    const panelY = panelPadding;
    const panelWidth = canvas.width - sidebarWidth - panelPadding * 2;
    const panelHeight = canvas.height - panelPadding * 2;

    ctx.save();

    // Background overlay (darken game area with vignette)
    ctx.fillStyle = 'rgba(5, 5, 5, 0.92)';
    ctx.fillRect(sidebarWidth, 0, canvas.width - sidebarWidth, canvas.height);

    // === PARCHMENT BACKGROUND ===
    // Aged parchment gradient
    const parchGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
    parchGrad.addColorStop(0, '#2a2420');
    parchGrad.addColorStop(0.05, '#3a3530');
    parchGrad.addColorStop(0.95, '#2a2520');
    parchGrad.addColorStop(1, '#1a1510');
    ctx.fillStyle = parchGrad;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Aged paper texture (spots/stains)
    ctx.fillStyle = 'rgba(139, 90, 43, 0.08)';
    for (let i = 0; i < 50; i++) {
        const spotX = panelX + Math.random() * panelWidth;
        const spotY = panelY + Math.random() * panelHeight;
        ctx.beginPath();
        ctx.arc(spotX, spotY, Math.random() * 15 + 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // === BURNED/WEATHERED EDGE EFFECT ===
    // Dark burned edges gradient
    const edgeSize = 40;
    // Top edge
    const topEdge = ctx.createLinearGradient(panelX, panelY, panelX, panelY + edgeSize);
    topEdge.addColorStop(0, 'rgba(20, 15, 10, 0.9)');
    topEdge.addColorStop(1, 'rgba(20, 15, 10, 0)');
    ctx.fillStyle = topEdge;
    ctx.fillRect(panelX, panelY, panelWidth, edgeSize);

    // Bottom edge
    const bottomEdge = ctx.createLinearGradient(panelX, panelY + panelHeight - edgeSize, panelX, panelY + panelHeight);
    bottomEdge.addColorStop(0, 'rgba(20, 15, 10, 0)');
    bottomEdge.addColorStop(1, 'rgba(20, 15, 10, 0.9)');
    ctx.fillStyle = bottomEdge;
    ctx.fillRect(panelX, panelY + panelHeight - edgeSize, panelWidth, edgeSize);

    // Left edge
    const leftEdge = ctx.createLinearGradient(panelX, panelY, panelX + edgeSize, panelY);
    leftEdge.addColorStop(0, 'rgba(20, 15, 10, 0.9)');
    leftEdge.addColorStop(1, 'rgba(20, 15, 10, 0)');
    ctx.fillStyle = leftEdge;
    ctx.fillRect(panelX, panelY, edgeSize, panelHeight);

    // Right edge
    const rightEdge = ctx.createLinearGradient(panelX + panelWidth - edgeSize, panelY, panelX + panelWidth, panelY);
    rightEdge.addColorStop(0, 'rgba(20, 15, 10, 0)');
    rightEdge.addColorStop(1, 'rgba(20, 15, 10, 0.9)');
    ctx.fillStyle = rightEdge;
    ctx.fillRect(panelX + panelWidth - edgeSize, panelY, edgeSize, panelHeight);

    // === ORNATE GOLD FRAME ===
    if (typeof drawTempleFrame === 'function') {
        drawTempleFrame(ctx, panelX, panelY, panelWidth, panelHeight, {
            cornerSize: 24, borderWidth: 5, pattern: true
        });
    } else {
        const frameGrad = ctx.createLinearGradient(panelX, panelY, panelX + panelWidth, panelY + panelHeight);
        frameGrad.addColorStop(0, frameGoldBright);
        frameGrad.addColorStop(0.3, frameGold);
        frameGrad.addColorStop(0.7, frameGoldDark);
        frameGrad.addColorStop(1, frameGold);
        ctx.strokeStyle = frameGrad;
        ctx.lineWidth = 5;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    }

    // Add ornate corners
    if (typeof drawOrnateCorners === 'function') {
        drawOrnateCorners(ctx, panelX, panelY, panelWidth, panelHeight, { size: 22 });
    }

    // === HEADER - Using new drawMapHeader function ===
    const headerHeight = drawMapHeader(ctx, panelX + 15, panelY + 5, panelWidth - 30);

    // Map area (inside panel, below header)
    const mapAreaX = panelX + 15;
    const mapAreaY = panelY + 5 + headerHeight + 5;
    const mapAreaWidth = panelWidth - 30;
    const mapAreaHeight = panelHeight - headerHeight - 55;

    // Map area background (darker for contrast)
    ctx.fillStyle = '#0a0908';
    ctx.fillRect(mapAreaX, mapAreaY, mapAreaWidth, mapAreaHeight);

    // Clip to map area
    ctx.save();
    ctx.beginPath();
    ctx.rect(mapAreaX, mapAreaY, mapAreaWidth, mapAreaHeight);
    ctx.clip();

    // Draw the dungeon map
    drawDungeonMap(mapAreaX, mapAreaY, mapAreaWidth, mapAreaHeight);

    ctx.restore();

    // Map area border (gold inset)
    ctx.strokeStyle = frameGoldDark;
    ctx.lineWidth = 2;
    ctx.strokeRect(mapAreaX, mapAreaY, mapAreaWidth, mapAreaHeight);

    // Draw legend panel
    drawMapLegend(panelX + 15, panelY + panelHeight - 38, panelWidth - 200, colors);

    // Draw zoom controls
    drawZoomControls(panelX, panelY, panelWidth, panelHeight);

    // Instructions (styled)
    ctx.fillStyle = colors.textMuted || '#706850';
    ctx.font = '11px serif';
    ctx.textAlign = 'center';
    ctx.fillText('Scroll to zoom | Drag to pan | [ESC] or [M] Close', panelX + panelWidth / 2, panelY + panelHeight - 10);

    ctx.restore();
}

/**
 * Draw map legend - Section 7.3 Improved Legend with shapes and better layout
 */
function drawMapLegend(x, y, width, colors) {
    const fontFamily = typeof UI_FONT_FAMILY !== 'undefined' ? UI_FONT_FAMILY : { body: 'Georgia, serif' };
    const uiColors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : colors;
    const textMuted = uiColors.textMuted || uiColors.textSecondary || '#b8a878';
    const goldDark = uiColors.goldDark || uiColors.frameGoldDark || '#8b6914';

    const legendItems = [
        { color: '#5588ff', label: 'You', shape: 'circle' },
        { color: '#ff4444', label: 'Enemies', shape: 'circle' },
        { color: '#ffcc00', label: 'Loot', shape: 'diamond' },
        { color: '#00ffcc', label: 'Exit', shape: 'square' },
        { color: '#daa520', label: 'Shrine', shape: 'star' },
        { color: '#666666', label: 'Unexplored', shape: 'square' }
    ];

    const legendHeight = 24;
    const itemSpacing = width / legendItems.length;

    // Background
    ctx.fillStyle = 'rgba(13, 13, 13, 0.85)';
    ctx.fillRect(x, y, width, legendHeight);

    // Border
    ctx.strokeStyle = goldDark;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, legendHeight);

    // Items
    ctx.font = '10px ' + fontFamily.body;
    ctx.textBaseline = 'middle';

    legendItems.forEach((item, i) => {
        const itemX = x + 15 + i * itemSpacing;
        const itemY = y + legendHeight / 2;

        // Shape
        ctx.fillStyle = item.color;
        const shapeSize = 6;

        switch (item.shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(itemX, itemY, shapeSize / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'diamond':
                ctx.beginPath();
                ctx.moveTo(itemX, itemY - shapeSize / 2);
                ctx.lineTo(itemX + shapeSize / 2, itemY);
                ctx.lineTo(itemX, itemY + shapeSize / 2);
                ctx.lineTo(itemX - shapeSize / 2, itemY);
                ctx.closePath();
                ctx.fill();
                break;
            case 'square':
                ctx.fillRect(itemX - shapeSize / 2, itemY - shapeSize / 2, shapeSize, shapeSize);
                break;
            case 'star':
                drawMiniStar(ctx, itemX, itemY, shapeSize / 2);
                break;
        }

        // Label
        ctx.fillStyle = textMuted;
        ctx.textAlign = 'left';
        ctx.fillText(item.label, itemX + 10, itemY);
    });
}

/**
 * Draw the dungeon map with current zoom and pan
 */
function drawDungeonMap(areaX, areaY, areaWidth, areaHeight) {
    if (!game.map || game.map.length === 0) return;

    const cfg = MAP_OVERLAY_CONFIG;
    const mapHeight = game.map.length;
    const mapWidth = game.map[0].length;

    // Calculate tile size based on zoom
    // At zoom 1, entire map fits in the area
    const baseTileSize = Math.min(areaWidth / mapWidth, areaHeight / mapHeight);
    const tileSize = baseTileSize * mapOverlayState.zoom;

    // Calculate visible area in tiles
    const visibleTilesX = Math.ceil(areaWidth / tileSize);
    const visibleTilesY = Math.ceil(areaHeight / tileSize);

    // Center offset (at zoom 1, map is centered)
    const totalMapWidth = mapWidth * tileSize;
    const totalMapHeight = mapHeight * tileSize;

    // Calculate pan limits
    const maxPanX = Math.max(0, (totalMapWidth - areaWidth) / tileSize / 2);
    const maxPanY = Math.max(0, (totalMapHeight - areaHeight) / tileSize / 2);

    // Clamp pan values
    mapOverlayState.panX = Math.max(-maxPanX, Math.min(maxPanX, mapOverlayState.panX));
    mapOverlayState.panY = Math.max(-maxPanY, Math.min(maxPanY, mapOverlayState.panY));

    // Calculate starting position
    const centerX = mapWidth / 2;
    const centerY = mapHeight / 2;
    const offsetX = areaX + areaWidth / 2 - (centerX + mapOverlayState.panX) * tileSize;
    const offsetY = areaY + areaHeight / 2 - (centerY + mapOverlayState.panY) * tileSize;

    // Calculate visible tile range
    const startTileX = Math.max(0, Math.floor(-offsetX / tileSize));
    const startTileY = Math.max(0, Math.floor(-offsetY / tileSize));
    const endTileX = Math.min(mapWidth, Math.ceil((areaWidth - offsetX) / tileSize) + 1);
    const endTileY = Math.min(mapHeight, Math.ceil((areaHeight - offsetY) / tileSize) + 1);

    // Draw tiles
    for (let y = startTileY; y < endTileY; y++) {
        for (let x = startTileX; x < endTileX; x++) {
            const tile = game.map[y]?.[x];
            if (!tile) continue;

            const screenX = offsetX + x * tileSize;
            const screenY = offsetY + y * tileSize;

            // Skip if completely outside area
            if (screenX + tileSize < areaX || screenX > areaX + areaWidth ||
                screenY + tileSize < areaY || screenY > areaY + areaHeight) {
                continue;
            }

            drawMapTile(screenX, screenY, tileSize, tile);
        }
    }

    // Draw room outlines for explored rooms (Section 7.2)
    drawRoomOutlines(ctx, areaX, areaY, tileSize, offsetX, offsetY);

    // Draw path down / descent location
    drawPathDown(offsetX, offsetY, tileSize);

    // Draw shrines (only if explored)
    drawMapShrines(offsetX, offsetY, tileSize);

    // Draw enemies and loot (only at zoom > 2x)
    if (mapOverlayState.zoom > 2) {
        drawMapEnemies(offsetX, offsetY, tileSize, areaX, areaY, areaWidth, areaHeight);
        drawMapLoot(offsetX, offsetY, tileSize, areaX, areaY, areaWidth, areaHeight);
    }

    // Draw player (ALWAYS visible)
    drawMapPlayer(offsetX, offsetY, tileSize);
}

/**
 * Draw a single tile on the map
 */
function drawMapTile(x, y, size, tile) {
    const cfg = MAP_OVERLAY_CONFIG;

    // Unexplored tiles are black
    if (!tile.explored) {
        ctx.fillStyle = cfg.unexploredColor;
        ctx.fillRect(x, y, size, size);
        return;
    }

    // Determine tile color based on type
    let color = cfg.unexploredColor;

    switch (tile.type) {
        case 'floor':
            color = tile.corridor ? cfg.corridorColor : cfg.floorColor;
            break;
        case 'wall':
        case 'interior_wall':
            color = cfg.wallColor;
            break;
        case 'doorway':
            color = cfg.floorColor;
            break;
        case 'exit':
            color = cfg.exitColor;
            break;
        default:
            color = cfg.unexploredColor;
    }

    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);

    // Add subtle grid lines at higher zoom
    if (mapOverlayState.zoom >= 4 && size > 4) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, size, size);
    }
}

/**
 * Draw the descent/path down location on the map
 */
function drawPathDown(offsetX, offsetY, tileSize) {
    let exitX = null, exitY = null;
    let isRevealed = false;

    // Check sessionState.pathDown first
    if (typeof sessionState !== 'undefined' && sessionState.pathDown) {
        const pd = sessionState.pathDown;
        if (pd.x !== null && pd.y !== null) {
            exitX = pd.x;
            exitY = pd.y;
            isRevealed = pd.revealed || pd.discovered;
        }
    }

    // Fallback to game.exitPosition
    if (exitX === null && typeof game !== 'undefined' && game.exitPosition) {
        exitX = game.exitPosition.x;
        exitY = game.exitPosition.y;
        isRevealed = true; // Legacy always visible
    }

    if (exitX === null || exitY === null) return;

    // Only show if revealed (mini-boss defeated or discovered)
    // For debugging, always show but dim if not revealed
    const screenX = offsetX + exitX * tileSize;
    const screenY = offsetY + exitY * tileSize;

    // Draw descent marker
    const cfg = MAP_OVERLAY_CONFIG;
    const pulse = Math.sin(Date.now() / 400) * 0.3 + 0.7;

    if (isRevealed) {
        // Bright purple/magenta for revealed descent
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(screenX, screenY, tileSize, tileSize);

        // Pulsing border
        ctx.strokeStyle = `rgba(255, 0, 255, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX - 1, screenY - 1, tileSize + 2, tileSize + 2);

        // Draw down arrow or "D" for descent
        ctx.fillStyle = '#000';
        ctx.font = `bold ${Math.max(8, tileSize - 2)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▼', screenX + tileSize / 2, screenY + tileSize / 2);
    } else {
        // Dim indicator when not yet revealed
        ctx.fillStyle = 'rgba(128, 0, 128, 0.3)';
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
    }
}

/**
 * Draw shrine markers on the map (only if explored)
 */
function drawMapShrines(offsetX, offsetY, tileSize) {
    if (!game.decorations) return;

    const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7;

    for (const decoration of game.decorations) {
        if (decoration.type !== 'shrine') continue;
        if (decoration.used) continue; // Skip used shrines

        const shrineX = Math.floor(decoration.x);
        const shrineY = Math.floor(decoration.y);

        // Check if tile is explored
        const tile = game.map[shrineY]?.[shrineX];
        if (!tile || !tile.explored) continue;

        const screenX = offsetX + shrineX * tileSize;
        const screenY = offsetY + shrineY * tileSize;

        // Draw shrine marker - cyan/teal torii gate style
        ctx.save();

        // Glow effect
        ctx.shadowColor = '#00ffaa';
        ctx.shadowBlur = 8;

        // Background circle
        ctx.fillStyle = '#00ffaa';
        ctx.globalAlpha = pulse * 0.3;
        ctx.beginPath();
        ctx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Torii gate icon
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#00ffaa';
        const s = tileSize * 0.4;
        const cx = screenX + tileSize / 2;
        const cy = screenY + tileSize / 2;

        // Top bar
        ctx.fillRect(cx - s, cy - s * 0.6, s * 2, s * 0.3);
        // Two pillars
        ctx.fillRect(cx - s * 0.8, cy - s * 0.4, s * 0.3, s * 1.2);
        ctx.fillRect(cx + s * 0.5, cy - s * 0.4, s * 0.3, s * 1.2);

        ctx.restore();
    }
}

/**
 * Draw player marker on the map
 */
function drawMapPlayer(offsetX, offsetY, tileSize) {
    if (!game.player) return;

    const cfg = MAP_OVERLAY_CONFIG;
    const playerX = Math.floor(game.player.gridX);
    const playerY = Math.floor(game.player.gridY);

    const screenX = offsetX + playerX * tileSize + tileSize / 2;
    const screenY = offsetY + playerY * tileSize + tileSize / 2;

    // Draw player marker (dark blue circle)
    const markerSize = Math.max(3, tileSize * 0.8);

    ctx.fillStyle = cfg.playerColor;
    ctx.beginPath();
    ctx.arc(screenX, screenY, markerSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Add white border for visibility
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Direction indicator at higher zoom
    if (mapOverlayState.zoom >= 2 && game.player.facing) {
        const facingX = game.player.facing.x || 0;
        const facingY = game.player.facing.y || 1;

        ctx.strokeStyle = cfg.playerColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + facingX * markerSize, screenY + facingY * markerSize);
        ctx.stroke();
    }
}

/**
 * Draw enemies on the map (only visible ones, only at zoom > 2)
 */
function drawMapEnemies(offsetX, offsetY, tileSize, areaX, areaY, areaWidth, areaHeight) {
    if (!game.enemies) return;

    const cfg = MAP_OVERLAY_CONFIG;

    for (const enemy of game.enemies) {
        if (enemy.hp <= 0) continue;

        const enemyX = Math.floor(enemy.gridX);
        const enemyY = Math.floor(enemy.gridY);

        // Only draw if tile is visible
        const tile = game.map[enemyY]?.[enemyX];
        if (!tile || !tile.visible) continue;

        const screenX = offsetX + enemyX * tileSize + tileSize / 2;
        const screenY = offsetY + enemyY * tileSize + tileSize / 2;

        // Skip if outside visible area
        if (screenX < areaX || screenX > areaX + areaWidth ||
            screenY < areaY || screenY > areaY + areaHeight) continue;

        // Draw enemy marker (red)
        const markerSize = Math.max(2, tileSize * 0.6);
        ctx.fillStyle = cfg.enemyColor;
        ctx.fillRect(screenX - markerSize / 2, screenY - markerSize / 2, markerSize, markerSize);
    }
}

/**
 * Draw loot on the map (only visible, only at zoom > 2)
 */
function drawMapLoot(offsetX, offsetY, tileSize, areaX, areaY, areaWidth, areaHeight) {
    if (!game.loot) return;

    const cfg = MAP_OVERLAY_CONFIG;

    for (const lootPile of game.loot) {
        const lootX = Math.floor(lootPile.x);
        const lootY = Math.floor(lootPile.y);

        // Only draw if tile is visible
        const tile = game.map[lootY]?.[lootX];
        if (!tile || !tile.visible) continue;

        const screenX = offsetX + lootX * tileSize + tileSize / 2;
        const screenY = offsetY + lootY * tileSize + tileSize / 2;

        // Skip if outside visible area
        if (screenX < areaX || screenX > areaX + areaWidth ||
            screenY < areaY || screenY > areaY + areaHeight) continue;

        // Draw loot marker (yellow diamond)
        const markerSize = Math.max(2, tileSize * 0.5);
        ctx.fillStyle = cfg.lootColor;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - markerSize / 2);
        ctx.lineTo(screenX + markerSize / 2, screenY);
        ctx.lineTo(screenX, screenY + markerSize / 2);
        ctx.lineTo(screenX - markerSize / 2, screenY);
        ctx.closePath();
        ctx.fill();
    }
}

/**
 * Draw zoom controls - CotDG Stone Button Style
 */
function drawZoomControls(panelX, panelY, panelWidth, panelHeight) {
    const cfg = MAP_OVERLAY_CONFIG;
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};
    const frameGold = colors.frameGold || '#b8860b';
    const frameGoldBright = colors.frameGoldBright || '#daa520';

    const buttonSize = 32;
    const buttonSpacing = 8;
    const controlsX = panelX + panelWidth - buttonSize * 2 - buttonSpacing - 20;
    const controlsY = panelY + panelHeight - buttonSize - 32;

    // Zoom out button (-)
    const minusX = controlsX;
    drawZoomButton(minusX, controlsY, buttonSize, '−', mapOverlayState.zoom > cfg.minZoom);

    // Zoom in button (+)
    const plusX = controlsX + buttonSize + buttonSpacing;
    drawZoomButton(plusX, controlsY, buttonSize, '+', mapOverlayState.zoom < cfg.maxZoom);

    // Zoom level indicator (styled)
    ctx.fillStyle = frameGoldBright;
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${mapOverlayState.zoom.toFixed(1)}×`, controlsX - 12, controlsY + buttonSize / 2 + 4);

    // Store button positions for click detection
    mapOverlayState.zoomOutButton = { x: minusX, y: controlsY, size: buttonSize };
    mapOverlayState.zoomInButton = { x: plusX, y: controlsY, size: buttonSize };
}

/**
 * Draw a zoom button - Stone Button Style
 */
function drawZoomButton(x, y, size, text, enabled) {
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};
    const frameGold = colors.frameGold || '#b8860b';
    const frameGoldBright = colors.frameGoldBright || '#daa520';
    const frameGoldDark = colors.frameGoldDark || '#8b6914';

    ctx.save();

    // Button background gradient (stone)
    const btnGrad = ctx.createLinearGradient(x, y, x, y + size);
    if (enabled) {
        btnGrad.addColorStop(0, '#3a3530');
        btnGrad.addColorStop(0.5, '#2a2520');
        btnGrad.addColorStop(1, '#1a1510');
    } else {
        btnGrad.addColorStop(0, '#252220');
        btnGrad.addColorStop(0.5, '#1a1816');
        btnGrad.addColorStop(1, '#0d0b0a');
    }
    ctx.fillStyle = btnGrad;
    ctx.fillRect(x, y, size, size);

    // Button border
    ctx.strokeStyle = enabled ? frameGold : frameGoldDark;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);

    // Corner accents
    if (enabled) {
        ctx.fillStyle = frameGoldDark;
        const cs = 4;
        ctx.fillRect(x, y, cs, 2);
        ctx.fillRect(x, y, 2, cs);
        ctx.fillRect(x + size - cs, y, cs, 2);
        ctx.fillRect(x + size - 2, y, 2, cs);
        ctx.fillRect(x, y + size - 2, cs, 2);
        ctx.fillRect(x, y + size - cs, 2, cs);
        ctx.fillRect(x + size - cs, y + size - 2, cs, 2);
        ctx.fillRect(x + size - 2, y + size - cs, 2, cs);
    }

    // Button text
    ctx.fillStyle = enabled ? frameGoldBright : '#555';
    ctx.font = 'bold 20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + size / 2, y + size / 2);

    ctx.restore();
}

/**
 * Handle mouse wheel for zoom
 */
function handleMapOverlayWheel(e) {
    if (game.state !== 'map') return;

    const cfg = MAP_OVERLAY_CONFIG;

    if (e.deltaY < 0) {
        // Zoom in
        mapOverlayState.zoom = Math.min(cfg.maxZoom, mapOverlayState.zoom + cfg.zoomStep);
    } else {
        // Zoom out
        mapOverlayState.zoom = Math.max(cfg.minZoom, mapOverlayState.zoom - cfg.zoomStep);
    }

    e.preventDefault();
}

/**
 * Handle mouse down for pan start
 */
function handleMapOverlayMouseDown(e) {
    if (game.state !== 'map') return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check zoom button clicks
    if (mapOverlayState.zoomInButton) {
        const btn = mapOverlayState.zoomInButton;
        if (clickX >= btn.x && clickX <= btn.x + btn.size &&
            clickY >= btn.y && clickY <= btn.y + btn.size) {
            mapOverlayState.zoom = Math.min(MAP_OVERLAY_CONFIG.maxZoom, mapOverlayState.zoom + MAP_OVERLAY_CONFIG.zoomStep);
            return;
        }
    }

    if (mapOverlayState.zoomOutButton) {
        const btn = mapOverlayState.zoomOutButton;
        if (clickX >= btn.x && clickX <= btn.x + btn.size &&
            clickY >= btn.y && clickY <= btn.y + btn.size) {
            mapOverlayState.zoom = Math.max(MAP_OVERLAY_CONFIG.minZoom, mapOverlayState.zoom - MAP_OVERLAY_CONFIG.zoomStep);
            return;
        }
    }

    // Start panning
    mapOverlayState.isDragging = true;
    mapOverlayState.dragStartX = clickX;
    mapOverlayState.dragStartY = clickY;
    mapOverlayState.dragStartPanX = mapOverlayState.panX;
    mapOverlayState.dragStartPanY = mapOverlayState.panY;
}

/**
 * Handle mouse move for panning
 */
function handleMapOverlayMouseMove(e) {
    if (game.state !== 'map' || !mapOverlayState.isDragging) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate pan delta based on zoom level - match drawMapOverlay dimensions
    const mapHeight = game.map?.length || 200;
    const mapWidth = game.map?.[0]?.length || 200;
    const sidebarWidth = typeof SIDEBAR_CONFIG !== 'undefined' ? SIDEBAR_CONFIG.width : 70;
    const panelPadding = 20;
    const mapAreaWidth = canvas.width - sidebarWidth - panelPadding * 2 - 20;
    const mapAreaHeight = canvas.height - panelPadding * 2 - 90;
    const baseTileSize = Math.min(mapAreaWidth / mapWidth, mapAreaHeight / mapHeight);
    const tileSize = baseTileSize * mapOverlayState.zoom;

    const deltaX = (mouseX - mapOverlayState.dragStartX) / tileSize;
    const deltaY = (mouseY - mapOverlayState.dragStartY) / tileSize;

    mapOverlayState.panX = mapOverlayState.dragStartPanX - deltaX;
    mapOverlayState.panY = mapOverlayState.dragStartPanY - deltaY;
}

/**
 * Handle mouse up for pan end
 */
function handleMapOverlayMouseUp(e) {
    mapOverlayState.isDragging = false;
}

/**
 * Reset map overlay state (called when opening)
 */
function resetMapOverlayState() {
    mapOverlayState.zoom = 1;
    mapOverlayState.panX = 0;
    mapOverlayState.panY = 0;
    mapOverlayState.isDragging = false;
}

/**
 * Initialize map overlay event handlers
 */
function initMapOverlay() {
    if (typeof canvas === 'undefined') {
        console.warn('Canvas not found for map overlay');
        return;
    }

    canvas.addEventListener('wheel', handleMapOverlayWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMapOverlayMouseDown);
    canvas.addEventListener('mousemove', handleMapOverlayMouseMove);
    canvas.addEventListener('mouseup', handleMapOverlayMouseUp);
    canvas.addEventListener('mouseleave', handleMapOverlayMouseUp);

    console.log('Map overlay initialized');
}

// Initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('load', initMapOverlay);
}

// ============================================================================
// DEBUG FUNCTIONS
// ============================================================================

/**
 * Reveal the entire map - marks all tiles as explored
 * Use this for debugging/testing purposes
 * Call from console: revealMap()
 */
function revealMap() {
    if (!game.map) {
        console.warn('[Debug] No map to reveal');
        return;
    }

    let revealedCount = 0;
    for (let y = 0; y < game.map.length; y++) {
        for (let x = 0; x < game.map[y].length; x++) {
            const tile = game.map[y][x];
            if (tile && !tile.explored) {
                tile.explored = true;
                revealedCount++;
            }
        }
    }

    // Also reveal path down if it exists
    if (typeof sessionState !== 'undefined' && sessionState.pathDown) {
        sessionState.pathDown.revealed = true;
        sessionState.pathDown.discovered = true;
    }

    console.log(`[Debug] Revealed ${revealedCount} tiles`);
    console.log('[Debug] Map fully explored - shrines, exit, and all areas now visible');

    return revealedCount;
}

/**
 * Hide the entire map - marks all tiles as unexplored (except player location)
 * Use this to reset exploration state for testing
 * Call from console: hideMap()
 */
function hideMap() {
    if (!game.map || !game.player) {
        console.warn('[Debug] No map to hide');
        return;
    }

    let hiddenCount = 0;
    const playerX = Math.floor(game.player.gridX);
    const playerY = Math.floor(game.player.gridY);

    for (let y = 0; y < game.map.length; y++) {
        for (let x = 0; x < game.map[y].length; x++) {
            const tile = game.map[y][x];
            if (tile && tile.explored) {
                // Keep a small area around player visible
                const dist = Math.abs(x - playerX) + Math.abs(y - playerY);
                if (dist > 3) {
                    tile.explored = false;
                    hiddenCount++;
                }
            }
        }
    }

    // Hide path down
    if (typeof sessionState !== 'undefined' && sessionState.pathDown) {
        sessionState.pathDown.revealed = false;
        sessionState.pathDown.discovered = false;
    }

    console.log(`[Debug] Hidden ${hiddenCount} tiles`);
    return hiddenCount;
}

// Export
window.drawMapOverlay = drawMapOverlay;
window.mapOverlayState = mapOverlayState;
window.resetMapOverlayState = resetMapOverlayState;
window.revealMap = revealMap;
window.hideMap = hideMap;

// Export new helper functions (Section 7)
window.drawMapHeader = drawMapHeader;
window.drawRoomOutlines = drawRoomOutlines;
window.isRoomExplored = isRoomExplored;
window.drawMapLegend = drawMapLegend;
window.drawMiniStar = drawMiniStar;

console.log('Map overlay loaded (with Section 7 improvements)');
console.log('  Debug: revealMap() / hideMap() available in console');
