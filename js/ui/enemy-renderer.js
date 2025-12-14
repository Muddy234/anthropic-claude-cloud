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
 * Draw attack windup visual effects
 * Shows distinct visuals for melee, ranged, and magic attacks
 */
function drawAttackWindup(ctx, enemy, ex, ey, cx, cy, tileSize) {
    // Get attack animation state
    if (typeof getAttackAnimationState !== 'function') return;

    const animState = getAttackAnimationState(enemy);
    if (!animState || !animState.isWindup) return;

    const progress = animState.progress;
    const type = animState.type;
    const target = animState.targetLocked;

    ctx.save();

    // Calculate direction to target
    let angle = 0;
    if (target) {
        const dx = target.x - enemy.gridX;
        const dy = target.y - enemy.gridY;
        angle = Math.atan2(dy, dx);
    } else {
        // Use facing direction if no target
        const facingCoords = getFacingCoordinates(enemy.facing);
        angle = Math.atan2(facingCoords.y, facingCoords.x);
    }

    // Base alpha that pulses and increases with progress
    const pulseSpeed = 12;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 1000 * pulseSpeed);
    const baseAlpha = 0.3 + progress * 0.5 + pulse * 0.2;

    // Draw different effects based on attack type
    switch (type) {
        case 'melee':
            // Slash arc telegraph - shows where the attack will swing
            ctx.strokeStyle = `rgba(255, 100, 50, ${baseAlpha})`;
            ctx.fillStyle = `rgba(255, 50, 0, ${baseAlpha * 0.3})`;
            ctx.lineWidth = 3 + progress * 2;

            // Draw arc showing attack range
            const arcRadius = tileSize * (0.8 + progress * 0.5);
            const arcSpread = Math.PI / 2;  // 90 degree arc

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, arcRadius, angle - arcSpread / 2, angle + arcSpread / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Inner charging arc
            if (progress > 0.3) {
                ctx.strokeStyle = `rgba(255, 200, 100, ${(progress - 0.3) * 1.5})`;
                ctx.lineWidth = 2;
                const innerRadius = arcRadius * 0.6 * progress;
                ctx.beginPath();
                ctx.arc(cx, cy, innerRadius, angle - arcSpread / 2, angle + arcSpread / 2);
                ctx.stroke();
            }
            break;

        case 'ranged':
            // Projectile charge - glowing orb forming at enemy
            const chargeRadius = 6 + progress * 10;

            // Outer glow
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, chargeRadius * 2);
            gradient.addColorStop(0, `rgba(255, 200, 50, ${baseAlpha})`);
            gradient.addColorStop(0.5, `rgba(255, 100, 0, ${baseAlpha * 0.5})`);
            gradient.addColorStop(1, `rgba(255, 50, 0, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, chargeRadius * 2, 0, Math.PI * 2);
            ctx.fill();

            // Core charge
            ctx.fillStyle = `rgba(255, 255, 200, ${0.5 + progress * 0.5})`;
            ctx.beginPath();
            ctx.arc(cx, cy, chargeRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Direction indicator (line toward target)
            if (progress > 0.5 && target) {
                ctx.strokeStyle = `rgba(255, 200, 50, ${(progress - 0.5) * 2})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                const lineLength = tileSize * 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angle) * lineLength, cy + Math.sin(angle) * lineLength);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            break;

        case 'magic':
            // Magic circle - arcane symbols forming around enemy
            const circleRadius = tileSize * 0.6 + progress * tileSize * 0.3;

            // Outer magic circle
            ctx.strokeStyle = `rgba(150, 50, 255, ${baseAlpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner rotating symbols (simplified as rotating lines)
            const numSymbols = 6;
            const rotationOffset = (Date.now() / 500) % (Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 100, 255, ${baseAlpha * 0.8})`;
            ctx.lineWidth = 2;

            for (let i = 0; i < numSymbols; i++) {
                const symbolAngle = (i / numSymbols) * Math.PI * 2 + rotationOffset;
                const symbolX = cx + Math.cos(symbolAngle) * circleRadius * 0.7;
                const symbolY = cy + Math.sin(symbolAngle) * circleRadius * 0.7;

                // Draw small rune-like marks
                ctx.beginPath();
                ctx.moveTo(symbolX - 4, symbolY);
                ctx.lineTo(symbolX + 4, symbolY);
                ctx.moveTo(symbolX, symbolY - 4);
                ctx.lineTo(symbolX, symbolY + 4);
                ctx.stroke();
            }

            // Central glow that intensifies
            const magicGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, circleRadius * 0.5);
            magicGradient.addColorStop(0, `rgba(200, 100, 255, ${progress * 0.6})`);
            magicGradient.addColorStop(1, `rgba(150, 50, 255, 0)`);
            ctx.fillStyle = magicGradient;
            ctx.beginPath();
            ctx.arc(cx, cy, circleRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            break;
    }

    // Draw direction indicator arrow for all types
    if (progress > 0.2) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${(progress - 0.2) * 0.8})`;
        ctx.lineWidth = 2;
        const arrowLen = tileSize * 0.6;
        const arrowX = cx + Math.cos(angle) * arrowLen;
        const arrowY = cy + Math.sin(angle) * arrowLen;

        // Arrow line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(arrowX, arrowY);
        ctx.stroke();

        // Arrow head
        const headLen = 8;
        const headAngle = Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
            arrowX - headLen * Math.cos(angle - headAngle),
            arrowY - headLen * Math.sin(angle - headAngle)
        );
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
            arrowX - headLen * Math.cos(angle + headAngle),
            arrowY - headLen * Math.sin(angle + headAngle)
        );
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Draw enemy overlays (tier indicator, alerts, health bar, combo indicator)
 * Works for both sprite and circle rendering
 */
function drawEnemyOverlays(ctx, enemy, ex, ey, cx, cy, tileSize) {
    const isTargeted = game.player?.combat?.currentTarget === enemy;
    const isElite = enemy.elite || enemy.tier === 'ELITE';

    // Draw attack windup effects first (behind other indicators)
    drawAttackWindup(ctx, enemy, ex, ey, cx, cy, tileSize);

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
        } else if (state === 'panicked') {
            // Panicked indicator - flashing exclamation with spiral effect
            ctx.fillStyle = Math.floor(Date.now() / 150) % 2 ? '#FF6B6B' : '#FFB3B3';
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('!!', cx, ey + 10);
            // Spiral lines showing panic
            ctx.strokeStyle = 'rgba(255, 107, 107, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const panicOffset = (Date.now() % 1000) / 1000 * Math.PI * 2;
            ctx.arc(cx, cy, tileSize * 0.4, panicOffset, panicOffset + Math.PI);
            ctx.stroke();
        } else if (state === 'enraged') {
            // Enraged indicator - pulsing angry face/symbol
            const pulse = 1 + 0.2 * Math.sin(Date.now() / 100);
            ctx.fillStyle = '#FF4444';
            ctx.font = `bold ${Math.floor(22 * pulse)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('💢', cx, ey + 12);
            // Red glow around enemy
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + 0.2 * Math.sin(Date.now() / 100)})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, tileSize * 0.6, 0, Math.PI * 2);
            ctx.stroke();
        } else if (state === 'reacting') {
            // Reacting indicator - "Huh?" moment - slow to notice player
            ctx.fillStyle = '#AAAAFF';
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('?!', cx, ey + 10);
            // Growing awareness ring
            const progress = Math.min(enemy.ai?.stateTimer / (enemy.ai?.reactionDelay || 600), 1);
            ctx.strokeStyle = `rgba(170, 170, 255, ${0.3 + progress * 0.4})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, tileSize * 0.3 + progress * tileSize * 0.3, 0, Math.PI * 2);
            ctx.stroke();
        } else if (state === 'sacrificing') {
            // Sacrificing indicator - Elite consuming a minion
            ctx.fillStyle = '#8B0000';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🩸', cx, ey + 12);
            // Dark aura
            ctx.strokeStyle = 'rgba(139, 0, 0, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, tileSize * 0.5, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (state === 'shouting') {
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
    // Check if enemy is staggered (frozen) - skip rendering movement if so
    const isStaggered = typeof isEnemyStaggered === 'function' && isEnemyStaggered(enemy);
    const staggerFlash = typeof getEnemyStaggerFlash === 'function' && getEnemyStaggerFlash(enemy);

    // Check for attack animation white flash (before attack execution)
    let attackFlash = false;
    if (typeof getAttackAnimationState === 'function') {
        const animState = getAttackAnimationState(enemy);
        if (animState && animState.inFlashPhase) {
            attackFlash = true;
        }
    }

    // Check for damage hit flash (red flash when taking damage)
    let hitFlash = false;
    if (enemy.hitFlash?.active) {
        const elapsed = Date.now() - enemy.hitFlash.time;
        if (elapsed < (enemy.hitFlash.duration || 100)) {
            hitFlash = true;
        } else {
            enemy.hitFlash.active = false;
        }
    }

    const ex = (enemy.displayX - camX) * tileSize + offsetX;
    const ey = (enemy.displayY - camY) * tileSize;
    const cx = ex + tileSize / 2;
    const cy = ey + tileSize / 2;

    // Apply stagger flash (white overlay)
    if (staggerFlash) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
    }

    // Try to draw sprite if available
    const spriteDrawn = tryDrawEnemySprite(ctx, enemy, ex, ey, cx, cy, tileSize);

    if (spriteDrawn) {
        // Sprite was drawn successfully, still draw overlays
        drawEnemyOverlays(ctx, enemy, ex, ey, cx, cy, tileSize);

        // Draw attack flash overlay (white flash before attack)
        if (attackFlash) {
            // Pulsing white flash that rapidly blinks
            const flashPulse = Math.sin(Date.now() / 30) > 0 ? 0.8 : 0.3;
            ctx.fillStyle = `rgba(255, 255, 255, ${flashPulse})`;
            ctx.fillRect(ex, ey, tileSize, tileSize);
        }

        // Draw damage hit flash overlay (red flash when taking damage)
        if (hitFlash) {
            const elapsed = Date.now() - enemy.hitFlash.time;
            const duration = enemy.hitFlash.duration || 100;
            const flashIntensity = 1 - (elapsed / duration);
            ctx.fillStyle = `rgba(255, 60, 60, ${flashIntensity * 0.6})`;
            ctx.fillRect(ex, ey, tileSize, tileSize);
        }

        // Draw stagger flash overlay
        if (staggerFlash) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(ex, ey, tileSize, tileSize);
            ctx.restore();
        }
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

    // Draw attack flash overlay for circle enemies (white flash before attack)
    if (attackFlash) {
        // Pulsing white flash that rapidly blinks
        const flashPulse = Math.sin(Date.now() / 30) > 0 ? 0.8 : 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashPulse})`;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw damage hit flash overlay for circle enemies (red flash when taking damage)
    if (hitFlash) {
        const elapsed = Date.now() - enemy.hitFlash.time;
        const duration = enemy.hitFlash.duration || 100;
        const flashIntensity = 1 - (elapsed / duration);
        ctx.fillStyle = `rgba(255, 60, 60, ${flashIntensity * 0.6})`;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw stagger flash overlay for circle enemies
    if (staggerFlash) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
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
 * Render all enemies on ALL tiles (with distance-based dimming)
 * - Enemies in torchlight: full brightness
 * - Enemies on explored tiles outside torch: dimmed based on distance
 * - Enemies on unexplored tiles: maximum dimming (same as far explored tiles)
 */
function renderAllEnemies(ctx, camX, camY, tileSize, offsetX) {
    if (!game.enemies) return;

    // MIN_BRIGHTNESS constant for unexplored tiles (matches renderer.js)
    const MIN_BRIGHTNESS = 0.55;

    // Calculate view bounds for frustum culling (with 2 tile margin)
    const viewLeft = camX - 2;
    const viewRight = camX + (ctx.canvas.width - offsetX) / tileSize + 2;
    const viewTop = camY - 2;
    const viewBottom = camY + ctx.canvas.height / tileSize + 2;

    for (const enemy of game.enemies) {
        // Frustum culling - skip enemies far outside view
        if (enemy.gridX < viewLeft || enemy.gridX > viewRight ||
            enemy.gridY < viewTop || enemy.gridY > viewBottom) {
            continue;
        }

        const enemyTileX = Math.floor(enemy.gridX);
        const enemyTileY = Math.floor(enemy.gridY);
        const tile = game.map[enemyTileY]?.[enemyTileX];

        // Skip if no tile data
        if (!tile) continue;

        // Determine brightness based on tile exploration status
        let brightness;
        if (tile.explored) {
            // Distance-based dimming for explored tiles
            brightness = typeof getTileBrightness === 'function'
                ? getTileBrightness(enemyTileX, enemyTileY)
                : 1.0;
        } else {
            // Maximum dimming for unexplored tiles
            brightness = MIN_BRIGHTNESS;
        }

        // Apply brightness as globalAlpha for dimming effect
        ctx.save();
        ctx.globalAlpha = brightness;

        drawEnemy(ctx, enemy, camX, camY, tileSize, offsetX);

        ctx.restore();
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
    window.drawAttackWindup = drawAttackWindup;
    window.drawTierIndicator = drawTierIndicator;
    window.drawEnemyHealthBar = drawEnemyHealthBar;
    window.renderAllEnemies = renderAllEnemies;
    window.renderAIDebugOverlay = renderAIDebugOverlay;
}

console.log('✅ Enemy renderer loaded (with attack windups + white flash)');