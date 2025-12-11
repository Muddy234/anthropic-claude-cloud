// ============================================================================
// MINI-MAP - CotDG Inspired Circular Radar
// ============================================================================
// Circular radar-style minimap with dark atmosphere and glowing entities
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

/**
 * Render the mini-map - CotDG style circular radar
 */
function renderMiniMap(ctx, canvasWidth) {
    if (!game.player || !game.map) return;

    const cfg = MINIMAP_CONFIG;

    // Get colors from design system
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDarkest: '#0a0a0f',
        bgDark: '#12121a',
        border: '#3a3a4a',
        corruption: '#8e44ad',
        health: '#c0392b',
        gold: '#d4af37',
        xp: '#5dade2',
        textMuted: '#666666',
        textPrimary: '#ffffff'
    };

    const centerX = canvasWidth - cfg.size / 2 - cfg.padding;
    const centerY = cfg.size / 2 + cfg.padding;
    const radius = cfg.size / 2;

    // Update animation state
    window.minimapState.scanAngle += cfg.scanLineSpeed * 16; // Assume ~60fps
    window.minimapState.pulsePhase += cfg.pulseSpeed * 16;

    ctx.save();

    // === CLIP TO CIRCULAR REGION ===
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
    ctx.clip();

    // === BACKGROUND ===
    const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    bgGrad.addColorStop(0, colors.bgDark || '#12121a');
    bgGrad.addColorStop(0.7, colors.bgDarkest || '#0a0a0f');
    bgGrad.addColorStop(1, '#000000');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(centerX - radius, centerY - radius, cfg.size, cfg.size);

    // === GRID LINES (subtle) ===
    drawMinimapGrid(ctx, centerX, centerY, radius, colors);

    // Calculate center tile (player position)
    const playerGridX = Math.floor(game.player.gridX);
    const playerGridY = Math.floor(game.player.gridY);

    // Calculate tile range to display
    const startX = Math.max(0, playerGridX - cfg.tileRadius);
    const endX = Math.min(game.map[0]?.length || 0, playerGridX + cfg.tileRadius);
    const startY = Math.max(0, playerGridY - cfg.tileRadius);
    const endY = Math.min(game.map.length, playerGridY + cfg.tileRadius);

    // === DRAW TILES ===
    for (let mapY = startY; mapY < endY; mapY++) {
        for (let mapX = startX; mapX < endX; mapX++) {
            const tile = game.map[mapY]?.[mapX];
            if (!tile) continue;

            // Calculate position on minimap
            const relX = mapX - playerGridX;
            const relY = mapY - playerGridY;
            const minimapX = centerX + (relX * cfg.tileSize);
            const minimapY = centerY + (relY * cfg.tileSize);

            // Check if within circular bounds
            const distFromCenter = Math.sqrt(relX * relX + relY * relY) * cfg.tileSize;
            if (distFromCenter > radius - 5) continue;

            drawMinimapTileCotDG(ctx, minimapX, minimapY, cfg.tileSize, tile, colors);
        }
    }

    // === DRAW ENTITIES ===
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
 */
function drawMinimapTileCotDG(ctx, x, y, size, tile, colors) {
    // Unexplored - completely dark
    if (!tile.explored) {
        return; // Don't draw unexplored tiles
    }

    // Dim if not currently visible
    const alpha = tile.visible ? 1.0 : 0.4;
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
    // Exit - glowing green
    else if (tile.type === 'exit') {
        const pulse = Math.sin(window.minimapState.pulsePhase * 2) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(46, 204, 113, ${pulse})`;
        ctx.fillRect(x - size/2, y - size/2, size, size);

        // Glow effect
        ctx.shadowColor = '#2ecc71';
        ctx.shadowBlur = 5;
        ctx.fillRect(x - size/2, y - size/2, size, size);
        ctx.shadowBlur = 0;
    }
    // Doorway
    else if (tile.type === 'doorway') {
        ctx.fillStyle = '#333340';
        ctx.fillRect(x - size/2, y - size/2, size, size);
    }

    ctx.globalAlpha = 1;
}

/**
 * Draw entities (enemies, loot, NPCs)
 */
function drawMinimapEntities(ctx, cx, cy, cfg, playerGridX, playerGridY, colors) {
    const pulse = Math.sin(window.minimapState.pulsePhase) * 0.3 + 0.7;
    const radius = cfg.size / 2;

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
            if (!tile || !tile.visible) continue;

            const minimapX = cx + (dx * cfg.tileSize);
            const minimapY = cy + (dy * cfg.tileSize);

            // Enemy dot with glow
            ctx.shadowColor = colors.health || '#c0392b';
            ctx.shadowBlur = 4;
            ctx.fillStyle = colors.health || '#c0392b';
            ctx.beginPath();
            ctx.arc(minimapX, minimapY, cfg.tileSize * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
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
            if (!tile || !tile.visible) continue;

            const minimapX = cx + (dx * cfg.tileSize);
            const minimapY = cy + (dy * cfg.tileSize);

            // Loot diamond with pulse
            ctx.fillStyle = colors.gold || '#d4af37';
            ctx.globalAlpha = pulse;
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
            if (!tile || !tile.visible) continue;

            const minimapX = cx + (dx * cfg.tileSize);
            const minimapY = cy + (dy * cfg.tileSize);

            // Chest square with gold border
            ctx.strokeStyle = colors.gold || '#d4af37';
            ctx.lineWidth = 1;
            ctx.strokeRect(minimapX - cfg.tileSize * 0.6, minimapY - cfg.tileSize * 0.6,
                          cfg.tileSize * 1.2, cfg.tileSize * 1.2);
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
 * Draw minimap frame (border, decorations)
 */
function drawMinimapFrame(ctx, cx, cy, radius, cfg, colors) {
    // Outer border ring
    ctx.strokeStyle = colors.border || '#3a3a4a';
    ctx.lineWidth = cfg.borderWidth;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner accent ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
    ctx.stroke();

    // Scan line (rotating radar effect)
    const scanAngle = window.minimapState.scanAngle;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(scanAngle);

    // Gradient for scan line fade
    const scanGrad = ctx.createLinearGradient(0, 0, radius - 5, 0);
    scanGrad.addColorStop(0, 'rgba(142, 68, 173, 0)');
    scanGrad.addColorStop(0.5, 'rgba(142, 68, 173, 0.3)');
    scanGrad.addColorStop(1, 'rgba(142, 68, 173, 0.6)');

    ctx.strokeStyle = scanGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius - 5, 0);
    ctx.stroke();

    // Scan fade trail
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = colors.corruption || '#8e44ad';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 5, -0.3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();

    // Corner decorations
    const cornerDist = radius * 0.85;
    const cornerSize = 6;
    ctx.fillStyle = colors.border || '#3a3a4a';

    // N
    ctx.beginPath();
    ctx.arc(cx, cy - cornerDist, cornerSize / 2, 0, Math.PI * 2);
    ctx.fill();
    // S
    ctx.beginPath();
    ctx.arc(cx, cy + cornerDist, cornerSize / 2, 0, Math.PI * 2);
    ctx.fill();
    // E
    ctx.beginPath();
    ctx.arc(cx + cornerDist, cy, cornerSize / 2, 0, Math.PI * 2);
    ctx.fill();
    // W
    ctx.beginPath();
    ctx.arc(cx - cornerDist, cy, cornerSize / 2, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Draw compass labels
 */
function drawMinimapCompass(ctx, cx, cy, radius, colors) {
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.textMuted || '#666666';

    const labelDist = radius + 10;

    ctx.fillText('N', cx, cy - labelDist);
    ctx.fillText('S', cx, cy + labelDist);
    ctx.fillText('E', cx + labelDist, cy);
    ctx.fillText('W', cx - labelDist, cy);
}

// Export
window.renderMiniMap = renderMiniMap;
window.MINIMAP_CONFIG = MINIMAP_CONFIG;

console.log('Mini-map loaded (CotDG style)');
