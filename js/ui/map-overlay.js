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
 * Draw the map overlay
 */
function drawMapOverlay() {
    const cfg = MAP_OVERLAY_CONFIG;

    // Get panel dimensions - use nearly all available space
    const sidebarWidth = typeof SIDEBAR_CONFIG !== 'undefined' ? SIDEBAR_CONFIG.width : 70;
    const panelPadding = 20; // Minimal padding
    const panelX = sidebarWidth + panelPadding;
    const panelY = panelPadding;
    const panelWidth = canvas.width - sidebarWidth - panelPadding * 2;
    const panelHeight = canvas.height - panelPadding * 2;

    // Background overlay (darken game area)
    ctx.fillStyle = cfg.bgColor;
    ctx.fillRect(sidebarWidth, 0, canvas.width - sidebarWidth, canvas.height);

    // Panel background
    ctx.fillStyle = cfg.panelBgColor;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Panel border
    ctx.strokeStyle = cfg.borderColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Title
    ctx.fillStyle = cfg.borderColor;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DUNGEON MAP', panelX + panelWidth / 2, panelY + 35);

    // Map area (inside panel, below title) - maximize space
    const mapAreaX = panelX + 10;
    const mapAreaY = panelY + 50;
    const mapAreaWidth = panelWidth - 20;
    const mapAreaHeight = panelHeight - 90; // Leave room for title and controls

    // Clip to map area
    ctx.save();
    ctx.beginPath();
    ctx.rect(mapAreaX, mapAreaY, mapAreaWidth, mapAreaHeight);
    ctx.clip();

    // Draw the dungeon map
    drawDungeonMap(mapAreaX, mapAreaY, mapAreaWidth, mapAreaHeight);

    ctx.restore();

    // Map area border
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapAreaX, mapAreaY, mapAreaWidth, mapAreaHeight);

    // Draw zoom controls
    drawZoomControls(panelX, panelY, panelWidth, panelHeight);

    // Instructions
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Scroll to zoom | Drag to pan | [ESC] or [M] Close', panelX + panelWidth / 2, panelY + panelHeight - 12);
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

    // Draw exit portal (ALWAYS visible, even unexplored)
    drawExitPortal(offsetX, offsetY, tileSize);

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
 * Draw exit portal on the map (always visible)
 */
function drawExitPortal(offsetX, offsetY, tileSize) {
    const cfg = MAP_OVERLAY_CONFIG;

    // Find exit tile
    for (let y = 0; y < game.map.length; y++) {
        for (let x = 0; x < game.map[0].length; x++) {
            const tile = game.map[y]?.[x];
            if (tile && tile.type === 'exit') {
                const screenX = offsetX + x * tileSize;
                const screenY = offsetY + y * tileSize;

                // Draw cyan square for exit
                ctx.fillStyle = cfg.exitColor;
                ctx.fillRect(screenX, screenY, tileSize, tileSize);

                // Add pulsing glow effect
                const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
                ctx.strokeStyle = `rgba(0, 255, 255, ${pulse})`;
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX - 1, screenY - 1, tileSize + 2, tileSize + 2);

                return; // Only one exit
            }
        }
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
 * Draw zoom controls
 */
function drawZoomControls(panelX, panelY, panelWidth, panelHeight) {
    const cfg = MAP_OVERLAY_CONFIG;
    const buttonSize = 30;
    const buttonSpacing = 10;
    const controlsX = panelX + panelWidth - buttonSize * 2 - buttonSpacing - 15;
    const controlsY = panelY + panelHeight - buttonSize - 35;

    // Zoom out button (-)
    const minusX = controlsX;
    drawZoomButton(minusX, controlsY, buttonSize, '-', mapOverlayState.zoom > cfg.minZoom);

    // Zoom in button (+)
    const plusX = controlsX + buttonSize + buttonSpacing;
    drawZoomButton(plusX, controlsY, buttonSize, '+', mapOverlayState.zoom < cfg.maxZoom);

    // Zoom level indicator
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${mapOverlayState.zoom.toFixed(1)}x`, controlsX - 10, controlsY + buttonSize / 2 + 4);

    // Store button positions for click detection
    mapOverlayState.zoomOutButton = { x: minusX, y: controlsY, size: buttonSize };
    mapOverlayState.zoomInButton = { x: plusX, y: controlsY, size: buttonSize };
}

/**
 * Draw a zoom button
 */
function drawZoomButton(x, y, size, text, enabled) {
    const cfg = MAP_OVERLAY_CONFIG;

    // Button background
    ctx.fillStyle = enabled ? cfg.buttonBgColor : '#222';
    ctx.fillRect(x, y, size, size);

    // Button border
    ctx.strokeStyle = enabled ? '#555' : '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);

    // Button text
    ctx.fillStyle = enabled ? cfg.buttonTextColor : '#555';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + size / 2, y + size / 2 + 7);
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

// Export
window.drawMapOverlay = drawMapOverlay;
window.mapOverlayState = mapOverlayState;
window.resetMapOverlayState = resetMapOverlayState;

console.log('Map overlay loaded');
