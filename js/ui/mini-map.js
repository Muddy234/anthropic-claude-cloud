// ============================================================================
// MINI-MAP - Radar-style map in top-right corner
// ============================================================================
// Shows nearby tiles, enemies, loot, and exit
// ============================================================================

// Mini-map configuration
const MINIMAP_CONFIG = {
    size: 180,           // Square size
    padding: 20,         // Distance from edges
    tileRadius: 20,      // How many tiles to show (20x20 area)
    tileSize: 4,         // Size of each tile on minimap (180 / 45 tiles)
    borderWidth: 2,
    // Colors
    bgColor: 'rgba(20, 20, 20, 0.85)',
    borderColor: '#444',
    wallColor: '#666',
    floorColor: '#2a2a2a',
    playerColor: '#3498db',
    enemyColor: '#e74c3c',
    lootColor: '#f1c40f',
    exitColor: '#2ecc71',
    unexploredColor: '#000',
    corridorColor: '#333'
};

/**
 * Render the mini-map
 */
function renderMiniMap(ctx, canvasWidth) {
    if (!game.player || !game.map) return;

    const cfg = MINIMAP_CONFIG;
    const x = canvasWidth - cfg.size - cfg.padding;
    const y = cfg.padding;

    // Background
    ctx.fillStyle = cfg.bgColor;
    ctx.fillRect(x, y, cfg.size, cfg.size);

    // Border
    ctx.strokeStyle = cfg.borderColor;
    ctx.lineWidth = cfg.borderWidth;
    ctx.strokeRect(x, y, cfg.size, cfg.size);

    // Calculate center tile (player position)
    const playerGridX = Math.floor(game.player.gridX);
    const playerGridY = Math.floor(game.player.gridY);

    // Calculate tile range to display
    const startX = Math.max(0, playerGridX - cfg.tileRadius);
    const endX = Math.min(game.map[0].length, playerGridX + cfg.tileRadius);
    const startY = Math.max(0, playerGridY - cfg.tileRadius);
    const endY = Math.min(game.map.length, playerGridY + cfg.tileRadius);

    // Draw tiles
    for (let mapY = startY; mapY < endY; mapY++) {
        for (let mapX = startX; mapX < endX; mapX++) {
            const tile = game.map[mapY]?.[mapX];
            if (!tile) continue;

            // Calculate position on minimap
            const relX = mapX - playerGridX;
            const relY = mapY - playerGridY;
            const minimapX = x + (cfg.size / 2) + (relX * cfg.tileSize);
            const minimapY = y + (cfg.size / 2) + (relY * cfg.tileSize);

            // Draw tile
            drawMinimapTile(ctx, minimapX, minimapY, cfg.tileSize, tile);
        }
    }

    // Draw enemies
    if (game.enemies) {
        for (const enemy of game.enemies) {
            if (enemy.hp <= 0) continue;

            const enemyX = Math.floor(enemy.gridX);
            const enemyY = Math.floor(enemy.gridY);

            // Only draw if in range and visible
            const dx = enemyX - playerGridX;
            const dy = enemyY - playerGridY;
            if (Math.abs(dx) > cfg.tileRadius || Math.abs(dy) > cfg.tileRadius) continue;

            const tile = game.map[enemyY]?.[enemyX];
            if (!tile || !tile.visible) continue;

            const minimapX = x + (cfg.size / 2) + (dx * cfg.tileSize);
            const minimapY = y + (cfg.size / 2) + (dy * cfg.tileSize);

            ctx.fillStyle = cfg.enemyColor;
            ctx.fillRect(minimapX, minimapY, cfg.tileSize, cfg.tileSize);
        }
    }

    // Draw loot
    if (game.loot) {
        for (const lootPile of game.loot) {
            const lootX = Math.floor(lootPile.x);
            const lootY = Math.floor(lootPile.y);

            const dx = lootX - playerGridX;
            const dy = lootY - playerGridY;
            if (Math.abs(dx) > cfg.tileRadius || Math.abs(dy) > cfg.tileRadius) continue;

            const tile = game.map[lootY]?.[lootX];
            if (!tile || !tile.visible) continue;

            const minimapX = x + (cfg.size / 2) + (dx * cfg.tileSize);
            const minimapY = y + (cfg.size / 2) + (dy * cfg.tileSize);

            ctx.fillStyle = cfg.lootColor;
            ctx.fillRect(minimapX, minimapY, cfg.tileSize, cfg.tileSize);
        }
    }

    // Draw player (always centered)
    const playerMinimapX = x + cfg.size / 2;
    const playerMinimapY = y + cfg.size / 2;

    ctx.fillStyle = cfg.playerColor;
    ctx.beginPath();
    ctx.arc(playerMinimapX, playerMinimapY, cfg.tileSize, 0, Math.PI * 2);
    ctx.fill();

    // Player direction indicator
    const facingX = game.player.facing?.x || 0;
    const facingY = game.player.facing?.y || 1;
    ctx.strokeStyle = cfg.playerColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playerMinimapX, playerMinimapY);
    ctx.lineTo(
        playerMinimapX + facingX * cfg.tileSize * 1.5,
        playerMinimapY + facingY * cfg.tileSize * 1.5
    );
    ctx.stroke();

    // Title
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#888';
    ctx.fillText('MINI-MAP', x + cfg.size / 2, y - 8);
}

/**
 * Draw a single tile on the minimap
 */
function drawMinimapTile(ctx, x, y, size, tile) {
    const cfg = MINIMAP_CONFIG;

    // Unexplored
    if (!tile.explored) {
        ctx.fillStyle = cfg.unexploredColor;
        ctx.fillRect(x, y, size, size);
        return;
    }

    // Floor types
    if (tile.type === 'floor') {
        if (tile.corridor) {
            ctx.fillStyle = cfg.corridorColor;
        } else {
            ctx.fillStyle = cfg.floorColor;
        }
        ctx.fillRect(x, y, size, size);
    }
    // Walls
    else if (tile.type === 'wall' || tile.type === 'interior_wall') {
        ctx.fillStyle = cfg.wallColor;
        ctx.fillRect(x, y, size, size);
    }
    // Exit
    else if (tile.type === 'exit') {
        ctx.fillStyle = cfg.exitColor;
        ctx.fillRect(x, y, size, size);
    }
    // Doorway
    else if (tile.type === 'doorway') {
        ctx.fillStyle = cfg.floorColor;
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = cfg.corridorColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);
    }
}

// Export
window.renderMiniMap = renderMiniMap;
window.MINIMAP_CONFIG = MINIMAP_CONFIG;

console.log('✅ Mini-map loaded');
