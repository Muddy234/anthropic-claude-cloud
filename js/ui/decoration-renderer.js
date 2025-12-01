// === js/rendering/decoration-renderer.js ===
// Renders room themes, decorations, and visual effects

/**
 * Draw a single decoration
 */
function drawDecoration(decoration, camX, camY, effectiveTileSize, offset) {
    const screenX = (decoration.x - camX) * effectiveTileSize + offset;
    const screenY = (decoration.y - camY) * effectiveTileSize;
    
    const data = decoration.data;
    
    // Draw glow effect first (if applicable)
    if (data.glow) {
        drawDecorationGlow(screenX, screenY, effectiveTileSize, data);
    }
    
    // Draw the decoration
    ctx.fillStyle = data.color;
    ctx.font = `${effectiveTileSize * 0.6}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const centerX = screenX + effectiveTileSize / 2;
    const centerY = screenY + effectiveTileSize / 2;
    
    // Size multiplier based on decoration size
    let sizeMultiplier = 1.0;
    if (data.size === 'small') sizeMultiplier = 0.7;
    if (data.size === 'large') sizeMultiplier = 1.3;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(sizeMultiplier, sizeMultiplier);
    ctx.fillText(data.symbol, 0, 0);
    ctx.restore();
}

/**
 * Draw glow effect around decoration
 */
function drawDecorationGlow(screenX, screenY, tileSize, data) {
    const centerX = screenX + tileSize / 2;
    const centerY = screenY + tileSize / 2;
    const glowRadius = tileSize * data.glowRadius;
    
    // Create radial gradient for glow
    const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, glowRadius
    );
    
    // Use decoration color with alpha
    const glowColor = data.color;
    gradient.addColorStop(0, glowColor + '40'); // 25% opacity at center
    gradient.addColorStop(0.5, glowColor + '20'); // 12% opacity at mid
    gradient.addColorStop(1, glowColor + '00'); // 0% opacity at edge
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Draw themed floor tile
 * This should be called when drawing each floor tile in your main render loop
 */
function drawThemedFloor(tile, screenX, screenY, effectiveTileSize) {
    // Use theme colors if available
    const floorColor = tile.floorColor || '#222';
    const accentColor = tile.accentColor || '#333';
    
    // Draw base floor
    ctx.fillStyle = floorColor;
    ctx.fillRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
    
    // Add subtle texture/pattern
    if (tile.accentColor) {
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.1;
        
        // Random small details for texture
        const seed = tile.x * 1000 + tile.y; // Consistent pattern based on position
        if (seed % 3 === 0) {
            ctx.fillRect(screenX + 2, screenY + 2, effectiveTileSize - 4, effectiveTileSize - 4);
        }
        
        ctx.globalAlpha = 1.0;
    }
    
    // Draw border
    ctx.strokeStyle = '#111';
    ctx.strokeRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
}

/**
 * Draw all decorations in view
 * Call this in your main render loop AFTER drawing floors but BEFORE drawing entities
 */
function renderRoomDecorations(camX, camY, effectiveTileSize, offset) {
    // Iterate through all rooms
    for (const room of game.rooms) {
        if (!room.decorations || room.decorations.length === 0) continue;
        
        // Only render decorations for rooms in view
        const roomScreenX = (room.x - camX) * effectiveTileSize + offset;
        const roomScreenY = (room.y - camY) * effectiveTileSize;
        const roomScreenW = room.width * effectiveTileSize;
        const roomScreenH = room.height * effectiveTileSize;
        
        // Basic frustum culling
        if (roomScreenX + roomScreenW < 0 || roomScreenX > canvas.width ||
            roomScreenY + roomScreenH < 0 || roomScreenY > canvas.height) {
            continue;
        }
        
        // Draw each decoration
        for (const decoration of room.decorations) {
            drawDecoration(decoration, camX, camY, effectiveTileSize, offset);
        }
    }
}

/**
 * Draw special feature (altar, forge, etc.)
 */
function drawSpecialFeature(feature, camX, camY, effectiveTileSize, offset) {
    const screenX = (feature.x - camX) * effectiveTileSize + offset;
    const screenY = (feature.y - camY) * effectiveTileSize;
    
    // Draw based on feature type
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${effectiveTileSize * 0.8}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let symbol = '⌘';
    if (feature.type === 'altar') symbol = '⛧';
    if (feature.type === 'shrine') symbol = '⛪';
    if (feature.type === 'forge_fire') symbol = '🔥';
    if (feature.type === 'lava_pools') symbol = '◉';
    
    ctx.fillText(symbol, screenX + effectiveTileSize / 2, screenY + effectiveTileSize / 2);
    
    // Draw glow
    if (feature.interactable) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX + 4, screenY + 4, effectiveTileSize - 8, effectiveTileSize - 8);
    }
}

/**
 * Render all special features
 */
function renderSpecialFeatures(camX, camY, effectiveTileSize, offset) {
    for (const room of game.rooms) {
        if (!room.features) continue;
        
        for (const feature of room.features) {
            drawSpecialFeature(feature, camX, camY, effectiveTileSize, offset);
        }
    }
}