// ============================================================================
// UNIT FRAMES - Curse of the Dead Gods Inspired Design
// ============================================================================
// Stylized player and enemy frames with animated bars and visual polish
// ============================================================================

// Unit frame configuration - uses design system
const UNIT_FRAME_CONFIG = {
    // Player frame (top-left, after sidebar)
    player: {
        x: 90,
        y: 16,
        width: 260,
        height: 85
    },
    // Enemy frame (next to player)
    enemy: {
        x: 370,
        y: 16,
        width: 260,
        height: 85
    },
    // Portrait
    portraitSize: 56,
    portraitPadding: 10,
    // Bars
    barHeight: 16,
    barSpacing: 3,
    // Status effects
    statusIconSize: 18,
    statusIconSpacing: 2,
    statusMaxIcons: 8,
    statusRows: 2,
    statusCols: 4
};

/**
 * Render both unit frames
 */
function renderUnitFrames(ctx) {
    if (!game.player) return;

    // Draw player frame
    renderPlayerFrame(ctx);

    // Draw enemy frame (only if target exists)
    const target = game.player.combat?.currentTarget;
    if (target && target.hp > 0) {
        renderEnemyFrame(ctx, target);
    }
}

/**
 * Render player unit frame - CotDG style
 */
function renderPlayerFrame(ctx) {
    const cfg = UNIT_FRAME_CONFIG;
    const frame = cfg.player;
    const player = game.player;

    // Get colors from design system (with fallbacks)
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDark: '#141414',
        bgMedium: '#1c1c1c',
        border: '#3a3530',
        mana: '#7a89c2',
        manaBright: '#9aa8d4',
        healthCritical: '#ff3030',
        textPrimary: '#efe4b0',
        gold: '#c9a227'
    };

    const fontFamily = typeof UI_FONT_FAMILY !== 'undefined' ? UI_FONT_FAMILY.display : 'Georgia, serif';

    ctx.save();

    // === PANEL BACKGROUND with gradient ===
    const panelGrad = ctx.createLinearGradient(frame.x, frame.y, frame.x, frame.y + frame.height);
    panelGrad.addColorStop(0, colors.bgMedium || '#1c1c1c');
    panelGrad.addColorStop(0.5, colors.bgDark || '#141414');
    panelGrad.addColorStop(1, colors.bgDarkest || '#0d0d0d');
    ctx.fillStyle = panelGrad;
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    // Border (thicker)
    ctx.strokeStyle = colors.border || '#3a3530';
    ctx.lineWidth = 3;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    // === CORNER ANCHORS - "bolt" the frame to the screen ===
    if (typeof drawCornerAnchors === 'function') {
        drawCornerAnchors(ctx, frame.x, frame.y, frame.width, frame.height, {
            color: colors.mana || '#7a89c2',
            size: 10,
            thickness: 2
        });
    }

    // Inner accent line (top) - spectral blue for player
    ctx.strokeStyle = colors.manaBright || '#9aa8d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(frame.x + 4, frame.y + 4);
    ctx.lineTo(frame.x + frame.width - 4, frame.y + 4);
    ctx.stroke();

    // === PORTRAIT ===
    const portraitX = frame.x + cfg.portraitPadding + cfg.portraitSize / 2;
    const portraitY = frame.y + frame.height / 2;

    // Portrait glow based on health
    const hpPct = player.hp / player.maxHp;

    // Outer glow for critical health
    if (hpPct < 0.25) {
        const pulse = typeof getPulseValue === 'function' ? getPulseValue(0.006) : 0.5;
        ctx.shadowColor = `rgba(231, 76, 60, ${0.3 + pulse * 0.4})`;
        ctx.shadowBlur = 15;
    }

    // Portrait background circle
    ctx.fillStyle = colors.mana || '#2980b9';
    ctx.beginPath();
    ctx.arc(portraitX, portraitY, cfg.portraitSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Portrait border
    ctx.strokeStyle = hpPct < 0.25 ? (colors.healthCritical || '#ff2222') : (colors.manaBright || '#3498db');
    ctx.lineWidth = 3;
    ctx.stroke();

    // Portrait content - clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(portraitX, portraitY, cfg.portraitSize / 2 - 3, 0, Math.PI * 2);
    ctx.clip();

    // Simple player icon (P)
    ctx.fillStyle = colors.manaBright || '#3498db';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', portraitX, portraitY + 2);
    ctx.restore();

    // === NAME AND LEVEL ===
    const textX = frame.x + cfg.portraitPadding * 2 + cfg.portraitSize + 8;
    const textY = frame.y + 18;

    // Player name with shadow - serif font
    ctx.font = `bold 14px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = colors.textPrimary || '#efe4b0';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 3;
    ctx.fillText('ADVENTURER', textX, textY);

    // Level badge - serif font
    ctx.font = `bold 11px ${fontFamily}`;
    ctx.fillStyle = colors.gold || '#c9a227';
    ctx.fillText(`LV.${player.level}`, textX + 95, textY);

    ctx.shadowBlur = 0;

    // === HEALTH BAR (Animated) ===
    const barX = textX;
    const barY = textY + 8;
    const barWidth = frame.width - (cfg.portraitPadding * 2 + cfg.portraitSize + 20);

    // Get animated HP value
    const displayHp = typeof updateAnimatedBar === 'function'
        ? updateAnimatedBar('player_hp', player.hp, player.maxHp, 0.016)
        : player.hp;

    drawHealthBarStyled(ctx, barX, barY, barWidth, cfg.barHeight, displayHp, player.maxHp, player.hp);

    // === MANA BAR ===
    const mpBarY = barY + cfg.barHeight + cfg.barSpacing;
    drawManaBarStyled(ctx, barX, mpBarY, barWidth, cfg.barHeight - 2, player.mp || 0, player.maxMp || 100);

    // === STAMINA PIPS (CotDG style diamonds) ===
    const staminaY = frame.y + frame.height - 14;
    drawStaminaPips(ctx, barX, staminaY, player.stamina, player.maxStamina);

    ctx.restore();
}

/**
 * Render enemy unit frame - CotDG style
 */
function renderEnemyFrame(ctx, enemy) {
    const cfg = UNIT_FRAME_CONFIG;
    const frame = cfg.enemy;

    // Get colors from design system (with fallbacks)
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDark: '#12121a',
        bgMedium: '#1a1a24',
        border: '#3a3a4a',
        health: '#c0392b',
        healthDark: '#8b1a1a',
        textPrimary: '#ffffff',
        textMuted: '#666666'
    };

    // Tier colors
    const tierColors = {
        'TIER_3': '#888888',
        'TIER_2': '#2ecc71',
        'TIER_1': '#3498db',
        'ELITE': '#9b59b6',
        'BOSS': '#f39c12'
    };
    const tierColor = tierColors[enemy.tier] || '#888888';

    ctx.save();

    // === PANEL BACKGROUND with gradient ===
    const panelGrad = ctx.createLinearGradient(frame.x, frame.y, frame.x, frame.y + frame.height);
    panelGrad.addColorStop(0, colors.bgMedium || '#1a1a24');
    panelGrad.addColorStop(1, colors.bgDark || '#12121a');
    ctx.fillStyle = panelGrad;
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    // Border (tier colored)
    ctx.strokeStyle = tierColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    // Inner accent line (top) - red for enemy
    ctx.strokeStyle = colors.health || '#c0392b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(frame.x + 2, frame.y + 2);
    ctx.lineTo(frame.x + frame.width - 2, frame.y + 2);
    ctx.stroke();

    // === PORTRAIT ===
    const portraitX = frame.x + cfg.portraitPadding + cfg.portraitSize / 2;
    const portraitY = frame.y + frame.height / 2;

    // Portrait background
    ctx.fillStyle = colors.healthDark || '#8b1a1a';
    ctx.beginPath();
    ctx.arc(portraitX, portraitY, cfg.portraitSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Portrait border (tier colored)
    ctx.strokeStyle = tierColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Portrait content - enemy sprite
    ctx.save();
    ctx.beginPath();
    ctx.arc(portraitX, portraitY, cfg.portraitSize / 2 - 3, 0, Math.PI * 2);
    ctx.clip();

    let spriteDrawn = false;
    if (typeof getEnemySpriteFrame === 'function') {
        const frameData = getEnemySpriteFrame(enemy);
        if (frameData) {
            const scale = (cfg.portraitSize - 6) / Math.max(frameData.frameWidth, frameData.frameHeight);
            const drawWidth = frameData.frameWidth * scale;
            const drawHeight = frameData.frameHeight * scale;
            const spriteX = portraitX - drawWidth / 2;
            const spriteY = portraitY - drawHeight / 2;

            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
                frameData.sprite,
                frameData.sourceX, frameData.sourceY,
                frameData.sourceWidth, frameData.sourceHeight,
                spriteX, spriteY, drawWidth, drawHeight
            );
            spriteDrawn = true;
        }
    }

    if (!spriteDrawn) {
        ctx.fillStyle = tierColor;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', portraitX, portraitY + 2);
    }
    ctx.restore();

    // === NAME AND LEVEL ===
    const textX = frame.x + cfg.portraitPadding * 2 + cfg.portraitSize + 8;
    const textY = frame.y + 18;

    // Enemy name
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;
    const enemyName = (enemy.name || 'Enemy').substring(0, 12);
    ctx.fillText(enemyName, textX, textY);

    // Level
    ctx.font = '12px monospace';
    ctx.fillStyle = tierColor;
    ctx.fillText(`LV.${enemy.level || 1}`, textX + 95, textY);

    ctx.shadowBlur = 0;

    // === HEALTH BAR (Animated) ===
    const barX = textX;
    const barY = textY + 8;
    const barWidth = frame.width - (cfg.portraitPadding * 2 + cfg.portraitSize + 20);

    // Get animated HP value
    const displayHp = typeof updateAnimatedBar === 'function'
        ? updateAnimatedBar(`enemy_${enemy.id || 'target'}_hp`, enemy.hp, enemy.maxHp, 0.016)
        : enemy.hp;

    drawHealthBarStyled(ctx, barX, barY, barWidth, cfg.barHeight, displayHp, enemy.maxHp, enemy.hp);

    // === ELEMENT/TYPE INDICATOR ===
    const typeY = barY + cfg.barHeight + cfg.barSpacing + 2;
    const element = enemy.element || 'physical';

    const elementColors = typeof UI_COLORS !== 'undefined' && UI_COLORS.elements
        ? UI_COLORS.elements
        : { fire: '#e67e22', water: '#3498db', earth: '#8b4513', nature: '#27ae60', shadow: '#9b59b6', death: '#555555', physical: '#95a5a6' };
    const elemColor = elementColors[element] || '#95a5a6';

    // Element pip
    ctx.fillStyle = elemColor;
    ctx.beginPath();
    ctx.arc(barX + 6, typeY + 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Type text
    ctx.font = '10px monospace';
    ctx.fillStyle = colors.textMuted || '#666666';
    ctx.textAlign = 'left';
    ctx.fillText(element.toUpperCase(), barX + 16, typeY + 8);

    // Tier indicator
    const tierIndicator = enemy.tierIndicator || '';
    if (tierIndicator) {
        ctx.fillStyle = tierColor;
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(tierIndicator, frame.x + frame.width - 10, typeY + 8);
    }

    ctx.restore();
}

/**
 * Draw stylized health bar with shine and damage trail
 */
function drawHealthBarStyled(ctx, x, y, width, height, displayHp, maxHp, actualHp) {
    const displayPct = Math.max(0, Math.min(1, displayHp / maxHp));
    const actualPct = Math.max(0, Math.min(1, actualHp / maxHp));

    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        healthDark: '#8b1a1a',
        healthBright: '#e74c3c',
        health: '#c0392b',
        border: '#3a3a4a',
        textPrimary: '#ffffff'
    };

    ctx.save();

    // Background
    ctx.fillStyle = colors.healthDark || '#8b1a1a';
    ctx.fillRect(x, y, width, height);

    // Damage trail (shows where health was)
    if (displayPct > actualPct) {
        ctx.fillStyle = 'rgba(231, 76, 60, 0.5)';
        ctx.fillRect(x, y, width * displayPct, height);
    }

    // Main health fill with gradient
    if (actualPct > 0) {
        const healthGrad = ctx.createLinearGradient(x, y, x, y + height);
        if (actualPct > 0.5) {
            healthGrad.addColorStop(0, colors.healthBright || '#e74c3c');
            healthGrad.addColorStop(0.5, colors.health || '#c0392b');
            healthGrad.addColorStop(1, '#8b1a1a');
        } else if (actualPct > 0.25) {
            healthGrad.addColorStop(0, '#e67e22');
            healthGrad.addColorStop(1, '#d35400');
        } else {
            // Critical - pulsing
            const pulse = typeof getPulseValue === 'function' ? getPulseValue(0.006) : 0.5;
            healthGrad.addColorStop(0, `rgb(${231 + pulse * 24}, ${76 - pulse * 40}, ${60 - pulse * 30})`);
            healthGrad.addColorStop(1, '#8b1a1a');
        }
        ctx.fillStyle = healthGrad;
        ctx.fillRect(x, y, width * actualPct, height);

        // Shine effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(x, y, width * actualPct, height / 3);
    }

    // Border
    ctx.strokeStyle = colors.border || '#3a3a4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // HP Text
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 3;
    ctx.fillText(`${Math.ceil(actualHp)}/${maxHp}`, x + width / 2, y + height / 2 + 1);

    ctx.restore();
}

/**
 * Draw stylized mana bar
 */
function drawManaBarStyled(ctx, x, y, width, height, current, max) {
    const pct = Math.max(0, Math.min(1, current / max));

    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        manaDark: '#1a3a5c',
        manaBright: '#3498db',
        mana: '#2980b9',
        border: '#3a3a4a',
        textSecondary: '#b0b0b0'
    };

    ctx.save();

    // Background
    ctx.fillStyle = colors.manaDark || '#1a3a5c';
    ctx.fillRect(x, y, width, height);

    // Fill
    if (pct > 0) {
        const manaGrad = ctx.createLinearGradient(x, y, x, y + height);
        manaGrad.addColorStop(0, colors.manaBright || '#3498db');
        manaGrad.addColorStop(1, colors.mana || '#2980b9');
        ctx.fillStyle = manaGrad;
        ctx.fillRect(x, y, width * pct, height);

        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, width * pct, height / 3);
    }

    // Border
    ctx.strokeStyle = colors.border || '#3a3a4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Text
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.textSecondary || '#b0b0b0';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;
    ctx.fillText(`${Math.ceil(current)}/${max}`, x + width / 2, y + height / 2 + 1);

    ctx.restore();
}

/**
 * Draw stamina pips (CotDG diamond style)
 */
function drawStaminaPips(ctx, x, y, current, max) {
    const pipSize = 8;
    const pipSpacing = 3;
    const pipsToShow = Math.min(max, 10); // Cap visual display at 10

    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        staminaBright: '#2ecc71',
        stamina: '#27ae60',
        bgLight: '#252530',
        border: '#3a3a4a'
    };

    ctx.save();

    for (let i = 0; i < pipsToShow; i++) {
        const pipX = x + i * (pipSize + pipSpacing);
        const pipY = y;

        const isFilled = i < current;

        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(pipX + pipSize / 2, pipY);
        ctx.lineTo(pipX + pipSize, pipY + pipSize / 2);
        ctx.lineTo(pipX + pipSize / 2, pipY + pipSize);
        ctx.lineTo(pipX, pipY + pipSize / 2);
        ctx.closePath();

        // Fill
        if (isFilled) {
            const staminaGrad = ctx.createLinearGradient(pipX, pipY, pipX, pipY + pipSize);
            staminaGrad.addColorStop(0, colors.staminaBright || '#2ecc71');
            staminaGrad.addColorStop(1, colors.stamina || '#27ae60');
            ctx.fillStyle = staminaGrad;
        } else {
            ctx.fillStyle = colors.bgLight || '#252530';
        }
        ctx.fill();

        // Border
        ctx.strokeStyle = isFilled ? (colors.stamina || '#27ae60') : (colors.border || '#3a3a4a');
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Initialize unit frame event handlers
 */
function initUnitFrameHandlers() {
    if (typeof canvas === 'undefined') return;

    // Right-click on enemy frame to inspect
    canvas.addEventListener('contextmenu', (e) => {
        if (game.state !== 'playing') return;
        if (!game.player?.combat?.currentTarget) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const cfg = UNIT_FRAME_CONFIG;
        const frame = cfg.enemy;

        // Check if click is within enemy frame
        if (clickX >= frame.x && clickX <= frame.x + frame.width &&
            clickY >= frame.y && clickY <= frame.y + frame.height) {

            e.preventDefault();

            // Open inspect popup for current target
            const target = game.player.combat.currentTarget;
            if (window.inspectPopup) {
                window.inspectPopup.visible = true;
                window.inspectPopup.target = target;
                window.inspectPopup.targetType = 'enemy';
                window.inspectPopup.tab = 0;
            }
        }
    });

    // Left-click anywhere to clear target (if not clicking UI elements)
    canvas.addEventListener('click', (e) => {
        if (game.state !== 'playing') return;
        if (!game.player?.combat?.currentTarget) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        // Check if clicking in UI areas
        const cfg = UNIT_FRAME_CONFIG;
        const inSidebar = clickX < TRACKER_WIDTH;
        const inPlayerFrame = clickX >= cfg.player.x && clickX <= cfg.player.x + cfg.player.width &&
                              clickY >= cfg.player.y && clickY <= cfg.player.y + cfg.player.height;
        const inEnemyFrame = clickX >= cfg.enemy.x && clickX <= cfg.enemy.x + cfg.enemy.width &&
                             clickY >= cfg.enemy.y && clickY <= cfg.enemy.y + cfg.enemy.height;

        // Action bar area (bottom-right)
        const actionBarY = canvas.height - 100;
        const inActionBar = clickY >= actionBarY && clickX >= canvas.width - 300;

        // If clicking UI, don't clear target
        if (inSidebar || inPlayerFrame || inEnemyFrame || inActionBar) {
            return;
        }

        // Calculate grid position to check for interactables
        const tileSize = (typeof TILE_SIZE !== 'undefined') ? TILE_SIZE : 32;
        const zoomLevel = window.currentZoom || ZOOM_LEVEL || 2;
        const effectiveTileSize = tileSize * zoomLevel;

        const viewX = clickX - TRACKER_WIDTH;
        const viewY = clickY;

        const camX = game.camera ? game.camera.x : 0;
        const camY = game.camera ? game.camera.y : 0;

        const gridX = Math.floor(viewX / effectiveTileSize + camX);
        const gridY = Math.floor(viewY / effectiveTileSize + camY);

        // Check if clicking on an enemy
        if (game.enemies) {
            const clickedEnemy = game.enemies.find(e =>
                Math.floor(e.gridX) === gridX && Math.floor(e.gridY) === gridY
            );
            if (clickedEnemy) {
                return;
            }
        }

        // Check if clicking on merchant/NPC
        if (game.merchant) {
            const mx = game.merchant.x !== undefined ? game.merchant.x : game.merchant.gridX;
            const my = game.merchant.y !== undefined ? game.merchant.y : game.merchant.gridY;
            if (gridX === mx && gridY === my) {
                return;
            }
        }

        // Clicking on empty game world - clear target
        if (game.player.combat) {
            game.player.combat.currentTarget = null;
        }
    });

}

// Initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('load', initUnitFrameHandlers);
}

// Export
window.renderUnitFrames = renderUnitFrames;
window.UNIT_FRAME_CONFIG = UNIT_FRAME_CONFIG;

// Unit frames loaded
