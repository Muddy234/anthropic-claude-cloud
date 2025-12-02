// === js/rendering/enemy-renderer.js ===
// Enemy rendering with tier indicators
// UPDATED: Adds tier indicators and AI state visualization
// FIXED: Proper handling of string/object facing directions

/**
 * Monster color palette
 */
const MONSTER_COLORS = {
    'Magma Slime': '#ff6b35',
    'Obsidian Golem': '#2c2c2c',
    'Cinder Wisp': '#ffeb3b',
    'Flame Bat': '#ff5722',
    'Ash Walker': '#757575',
    'Salamander': '#4caf50',
    'Pyro Cultist': '#d32f2f'
};

/**
 * Convert facing direction to x,y coordinates
 * Handles both string format ('up', 'down', 'left', 'right') and object format ({x, y})
 */
function getFacingCoordinates(facing) {
    if (typeof facing === 'string') {
        // String format from AI system
        switch (facing) {
            case 'up':    return { x: 0,  y: -1 };
            case 'down':  return { x: 0,  y: 1 };
            case 'left':  return { x: -1, y: 0 };
            case 'right': return { x: 1,  y: 0 };
            default:      return { x: 0,  y: 1 };
        }
    } else if (facing && typeof facing === 'object') {
        // Object format (legacy)
        return {
            x: facing.x || 0,
            y: facing.y || 1
        };
    } else {
        // Fallback
        return { x: 0, y: 1 };
    }
}

/**
 * Try to draw enemy as animated sprite
 * @returns {boolean} True if sprite was drawn, false if should fall back to circle
 */
function tryDrawEnemySprite(ctx, enemy, ex, ey, cx, cy, tileSize) {
    // Check if sprite rendering is available
    if (typeof getEnemySpriteFrame !== 'function') return false;

    const frameData = getEnemySpriteFrame(enemy);
    if (!frameData) return false;

    // Draw sprite
    ctx.imageSmoothingEnabled = false; // Pixel art

    // Center the sprite in the tile
    const spriteWidth = frameData.frameWidth;
    const spriteHeight = frameData.frameHeight;

    // Scale sprite to 1.5x tile size for better visibility
    const targetSize = tileSize * 1.5;
    const scale = Math.min(targetSize / spriteWidth, targetSize / spriteHeight);
    const drawWidth = spriteWidth * scale;
    const drawHeight = spriteHeight * scale;

    // Center in tile (sprite will overflow tile bounds, which is desired)
    const spriteX = ex + (tileSize - drawWidth) / 2;
    const spriteY = ey + (tileSize - drawHeight) / 2;

    ctx.drawImage(
        frameData.sprite,
        frameData.sourceX,
        frameData.sourceY,
        frameData.sourceWidth,
        frameData.sourceHeight,
        spriteX,
        spriteY,
        drawWidth,
        drawHeight
    );

    // Draw targeted outline for sprites
    const isTargeted = game.player?.combat?.currentTarget === enemy;
    if (isTargeted) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(ex, ey, tileSize, tileSize);
    }

    return true; // Sprite drawn successfully
}

/**
 * Draw enemy overlays (tier indicator, alerts, health bar)
 * Works for both sprite and circle rendering
 */
function drawEnemyOverlays(ctx, enemy, ex, ey, cx, cy, tileSize) {
    const isTargeted = game.player?.combat?.currentTarget === enemy;
    const isElite = enemy.elite || enemy.tier === 'ELITE';

    // Draw tier indicator
    drawTierIndicator(ctx, enemy, cx, ey, tileSize);

    // Draw alert indicators
    if (enemy.ai) {
        const state = enemy.ai.currentState;
        if (state === 'chasing' || state === 'combat') {
            ctx.fillStyle = '#f00';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('!', cx, ey + 10);
        } else if (state === 'alert' || state === 'searching') {
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('?', cx, ey + 10);
        } else if (state === 'shouting') {
            // Shouting indicator - concentric circles
            ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
            ctx.lineWidth = 2;
            const progress = enemy.ai.shoutTimer / (enemy.aiConfig?.communication?.shoutDelay || 1);
            for (let i = 0; i < 3; i++) {
                const ringRadius = tileSize / 2 + 10 + (i * 8 * progress);
                ctx.beginPath();
                ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    } else if (enemy.state === 'chasing') {
        ctx.fillStyle = '#f00';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', cx, ey + 10);
    }

    // Draw health bar
    const isDamaged = enemy.hp < enemy.maxHp;
    if (isDamaged || enemy.combat?.isInCombat) {
        const barHeight = isTargeted ? 8 : 4;
        const barY = isTargeted ? ey - 20 : ey - 15;
        drawEnemyHealthBar(ctx, ex, barY, tileSize, enemy.hp, enemy.maxHp, isTargeted, barHeight);
    }
}

/**
 * Draw a single enemy with all visual elements
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} enemy - Enemy object
 * @param {number} camX - Camera X position
 * @param {number} camY - Camera Y position
 * @param {number} tileSize - Size of tiles in pixels
 * @param {number} offsetX - X offset (tracker width)
 */
function drawEnemy(ctx, enemy, camX, camY, tileSize, offsetX) {
    const ex = (enemy.displayX - camX) * tileSize + offsetX;
    const ey = (enemy.displayY - camY) * tileSize;
    const cx = ex + tileSize / 2;
    const cy = ey + tileSize / 2;

    // Try to draw sprite if available
    const spriteDrawn = tryDrawEnemySprite(ctx, enemy, ex, ey, cx, cy, tileSize);

    if (spriteDrawn) {
        // Sprite was drawn successfully, still draw overlays
        drawEnemyOverlays(ctx, enemy, ex, ey, cx, cy, tileSize);
        return;
    }

    // Fallback: Get base color and draw circle
    const baseColor = MONSTER_COLORS[enemy.name] || '#e74c3c';
    
    // Calculate radius based on elite status
    const isElite = enemy.elite || enemy.tier === 'ELITE';
    const radius = isElite ? (tileSize / 2) - 8 : (tileSize / 2) - 12;
    
    // Draw enemy body
    // Color changes based on AI state
    let bodyColor = baseColor;
    if (enemy.ai) {
        switch (enemy.ai.currentState) {
            case 'chasing':
            case 'combat':
                bodyColor = '#e67e22'; // Orange when aggressive
                break;
            case 'fleeing':
                bodyColor = '#9b59b6'; // Purple when fleeing
                break;
            case 'alert':
            case 'searching':
                bodyColor = '#f39c12'; // Yellow when alert
                break;
        }
    } else if (enemy.state === 'chasing') {
        bodyColor = '#e67e22';
    }
    
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Elite border
    if (isElite) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // Targeted enemy outline (red)
    const isTargeted = game.player?.combat?.currentTarget === enemy;
    if (isTargeted) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Draw facing direction indicator
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const len = 15;
    
    // Convert facing to coordinates (handle both string and object formats)
    const facingCoords = getFacingCoordinates(enemy.facing);
    const facingX = facingCoords.x;
    const facingY = facingCoords.y;
    
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + facingX * len, cy + facingY * len);
    ctx.stroke();
    
    // Draw facing dot
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx + facingX * len - 2, cy + facingY * len - 2, 4, 4);

    // Draw overlays (tier, alerts, health bar)
    drawEnemyOverlays(ctx, enemy, ex, ey, cx, cy, tileSize);
}

/**
 * Draw tier indicator above enemy
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} enemy - Enemy object
 * @param {number} cx - Center X position on screen
 * @param {number} ey - Top Y position on screen
 * @param {number} tileSize - Tile size for scaling
 */
function drawTierIndicator(ctx, enemy, cx, ey, tileSize) {
    // Get tier info
    const indicator = enemy.tierIndicator || '?';
    const color = enemy.tierColor || '#888888';
    
    // Position above the enemy
    const indicatorY = ey - 5;
    
    // Draw background pill
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const textWidth = ctx.measureText(indicator).width;
    const pillWidth = Math.max(20, textWidth + 8);
    const pillHeight = 16;
    const pillX = cx - pillWidth / 2;
    const pillY = indicatorY - pillHeight;
    
    // Rounded rectangle
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 4);
    ctx.fill();
    
    // Draw border for elites
    if (enemy.tier === 'ELITE') {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // Draw tier text
    ctx.fillStyle = color;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(indicator, cx, indicatorY - pillHeight / 2);
    
    // Reset baseline
    ctx.textBaseline = 'alphabetic';
}

/**
 * Draw health bar for enemy
 */
function drawEnemyHealthBar(ctx, x, y, width, hp, maxHp, isTargeted, barHeight) {
    // Default bar height if not specified
    barHeight = barHeight || 4;

    const pct = Math.max(0, Math.min(1, hp / maxHp));

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, width, barHeight);

    // Health fill
    ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.2 ? '#f1c40f' : '#e74c3c';
    ctx.fillRect(x, y, width * pct, barHeight);

    // Border (yellow for targeted enemy, black for normal)
    ctx.strokeStyle = isTargeted ? '#ffff00' : '#111';
    ctx.lineWidth = isTargeted ? 2 : 1;
    ctx.strokeRect(x, y, width, barHeight);
}

/**
 * Render all enemies (only those visible to the player)
 * Call this from your main render function instead of the inline enemy loop
 */
function renderAllEnemies(ctx, camX, camY, tileSize, offsetX) {
    if (!game.enemies) return;

    for (const enemy of game.enemies) {
        // FOG OF WAR: Only render enemies that are visible to the player
        if (enemy.isVisible === false) continue;

        // Also check tile visibility as fallback
        const enemyTileX = Math.floor(enemy.gridX);
        const enemyTileY = Math.floor(enemy.gridY);
        if (game.map[enemyTileY]?.[enemyTileX]?.visible === false) continue;

        drawEnemy(ctx, enemy, camX, camY, tileSize, offsetX);
    }
}

/**
 * Debug: Draw AI vision cones and hearing radius
 * Enable with: game.debugOverlay = { showAI: true }
 */
function renderAIDebugOverlay(ctx, camX, camY, tileSize, offsetX) {
    if (!game.debugOverlay?.showAI || !game.enemies) return;
    
    for (const enemy of game.enemies) {
        if (!enemy.ai || !enemy.senses) continue;
        
        const ex = (enemy.displayX - camX) * tileSize + offsetX;
        const ey = (enemy.displayY - camY) * tileSize;
        const cx = ex + tileSize / 2;
        const cy = ey + tileSize / 2;
        
        // Draw hearing radius
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, enemy.senses.hearingRange * tileSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw vision cone
        const visionRange = enemy.senses.visionRange * tileSize;
        const coneAngle = (enemy.senses.visionConeAngle || 90) * Math.PI / 180;
        
        // Get facing angle - FIXED: Use helper function
        const facingCoords = getFacingCoordinates(enemy.facing);
        const baseAngle = Math.atan2(facingCoords.y, facingCoords.x);
        
        ctx.fillStyle = 'rgba(255, 255, 0, 0.15)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, visionRange, baseAngle - coneAngle / 2, baseAngle + coneAngle / 2);
        ctx.closePath();
        ctx.fill();
        
        // Draw current state text
        if (enemy.ai.currentState) {
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(enemy.ai.currentState.toUpperCase(), cx, ey + tileSize + 12);
        }
        
        // Draw target line if has target
        if (enemy.ai.target || enemy.ai.lastKnownTargetPos) {
            const target = enemy.ai.target || enemy.ai.lastKnownTargetPos;
            const tx = (target.x || target.gridX || target.displayX) - camX;
            const ty = (target.y || target.gridY || target.displayY) - camY;
            
            ctx.strokeStyle = enemy.ai.target ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 165, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(tx * tileSize + offsetX + tileSize / 2, ty * tileSize + tileSize / 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}


// ============================================================
// GLOBAL EXPORTS
// ============================================================

if (typeof window !== 'undefined') {
    window.MONSTER_COLORS = MONSTER_COLORS;
    window.getFacingCoordinates = getFacingCoordinates;
    window.drawEnemy = drawEnemy;
    window.drawTierIndicator = drawTierIndicator;
    window.drawEnemyHealthBar = drawEnemyHealthBar;
    window.renderAllEnemies = renderAllEnemies;
    window.renderAIDebugOverlay = renderAIDebugOverlay;
}

console.log('✅ Enemy renderer loaded (with tier indicators + facing fix)');