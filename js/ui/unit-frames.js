// ============================================================================
// UNIT FRAMES - Curse of the Dead Gods Inspired Design (Enhanced)
// ============================================================================
// Stylized player and enemy frames with ornate borders, animated bars,
// segmented health options, and gem-socket status effects
// ============================================================================

// Unit frame configuration - uses design system
const UNIT_FRAME_CONFIG = {
    // Player frame (top-left, after sidebar)
    player: {
        x: 90,
        y: 16,
        width: 280,
        height: 90
    },
    // Enemy frame (next to player)
    enemy: {
        x: 390,
        y: 16,
        width: 280,
        height: 90
    },
    // Portrait
    portraitSize: 58,
    portraitPadding: 10,
    // Bars
    barHeight: 18,
    barSpacing: 4,
    // Status effects (gem socket style)
    statusIconSize: 20,
    statusIconSpacing: 3,
    statusMaxIcons: 8,
    statusRows: 2,
    statusCols: 4,
    // Frame decoration
    frameCornerSize: 14,
    frameBorderWidth: 4
};

/**
 * Render both unit frames
 */
function renderUnitFrames(ctx) {
    if (!game.player) return;

    // Draw player frame
    renderPlayerFrame(ctx);

    // Draw player status effects
    renderPlayerStatusEffects(ctx);

    // Draw boon icons below status effects / stamina area
    renderBoonIcons(ctx, UNIT_FRAME_CONFIG.player.x + UNIT_FRAME_CONFIG.portraitPadding,
                    UNIT_FRAME_CONFIG.player.y + UNIT_FRAME_CONFIG.player.height + 52);

    // Draw boon tooltip if hovering
    renderBoonTooltip(ctx);

    // Draw enemy frame (only if target exists)
    const target = game.player.combat?.currentTarget;
    if (target && target.hp > 0) {
        renderEnemyFrame(ctx, target);
        // Draw enemy status effects
        renderEnemyStatusEffects(ctx, target);
    }
}

/**
 * Render player unit frame - CotDG style with ornate gold frame
 */
function renderPlayerFrame(ctx) {
    const cfg = UNIT_FRAME_CONFIG;
    const frame = cfg.player;
    const player = game.player;

    // Get colors from design system (with fallbacks)
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDark: '#141414',
        bgMedium: '#1c1c1c',
        bgDarkest: '#0d0d0d',
        border: '#3a3530',
        mana: '#7a89c2',
        manaBright: '#9aa8d4',
        healthCritical: '#ff3030',
        textPrimary: '#efe4b0',
        gold: '#c9a227',
        frameGold: '#b8860b',
        frameGoldBright: '#daa520',
        frameGoldDark: '#8b6914'
    };

    const fontFamily = typeof UI_FONT_FAMILY !== 'undefined' ? UI_FONT_FAMILY.display : 'Georgia, serif';

    ctx.save();

    // === SHADOW for depth ===
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(frame.x + 4, frame.y + 4, frame.width, frame.height);

    // === PANEL BACKGROUND with gradient ===
    const panelGrad = ctx.createLinearGradient(frame.x, frame.y, frame.x, frame.y + frame.height);
    panelGrad.addColorStop(0, colors.bgMedium || '#1c1c1c');
    panelGrad.addColorStop(0.3, colors.bgDark || '#141414');
    panelGrad.addColorStop(1, colors.bgDarkest || '#0d0d0d');
    ctx.fillStyle = panelGrad;
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    // === ORNATE GOLD FRAME BORDER ===
    // Outer dark edge
    ctx.strokeStyle = colors.frameGoldDark || '#8b6914';
    ctx.lineWidth = cfg.frameBorderWidth + 1;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    // Main gold frame
    ctx.strokeStyle = colors.frameGold || '#b8860b';
    ctx.lineWidth = cfg.frameBorderWidth;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    // Inner bright edge highlight
    ctx.strokeStyle = colors.frameGoldBright || '#daa520';
    ctx.lineWidth = 1;
    ctx.strokeRect(frame.x + cfg.frameBorderWidth, frame.y + cfg.frameBorderWidth,
                   frame.width - cfg.frameBorderWidth * 2, frame.height - cfg.frameBorderWidth * 2);

    // === ORNATE CORNER FLOURISHES ===
    if (typeof drawOrnateCorners === 'function') {
        drawOrnateCorners(ctx, frame.x - 2, frame.y - 2, frame.width + 4, frame.height + 4, {
            color: colors.frameGold || '#b8860b',
            colorBright: colors.frameGoldBright || '#daa520',
            colorDark: colors.frameGoldDark || '#8b6914',
            size: cfg.frameCornerSize,
            thickness: 2,
            curls: true
        });
    }

    // Inner accent line (top) - spectral blue for player mana affinity
    ctx.strokeStyle = colors.manaBright || '#9aa8d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(frame.x + cfg.frameBorderWidth + 2, frame.y + cfg.frameBorderWidth + 2);
    ctx.lineTo(frame.x + frame.width - cfg.frameBorderWidth - 2, frame.y + cfg.frameBorderWidth + 2);
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

    // Floor indicator (Soul & Body model - no player levels)
    ctx.font = `bold 11px ${fontFamily}`;
    ctx.fillStyle = colors.gold || '#c9a227';
    const floorNum = game.floor || 1;
    ctx.fillText(`F${floorNum}`, textX + 95, textY);

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

    // Use StaminaSystem if available for more detailed state
    if (typeof StaminaSystem !== 'undefined') {
        const staminaState = {
            current: StaminaSystem.getCurrent(),
            max: StaminaSystem.getMax(),
            isExhausted: StaminaSystem.isExhausted(),
            isRegenerating: StaminaSystem.isRegenerating(),
            refundFlash: StaminaSystem.feedback?.refundFlash || false,
            exhaustedFlash: StaminaSystem.feedback?.exhaustedFlash || false,
            filledSegments: StaminaSystem.getFilledSegments(),
            segmentPartial: StaminaSystem.getSegmentPartial()
        };
        drawStaminaPipsEnhanced(ctx, barX, staminaY, staminaState);
    } else {
        // Fallback to basic display
        drawStaminaPips(ctx, barX, staminaY, player.stamina || 0, player.maxStamina || 100);
    }

    ctx.restore();
}

/**
 * Render enemy unit frame - CotDG style with tier-based ornate frame
 */
function renderEnemyFrame(ctx, enemy) {
    const cfg = UNIT_FRAME_CONFIG;
    const frame = cfg.enemy;

    // Get colors from design system (with fallbacks)
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDark: '#12121a',
        bgMedium: '#1a1a24',
        bgDarkest: '#0a0a0f',
        border: '#3a3a4a',
        health: '#c0392b',
        healthDark: '#8b1a1a',
        textPrimary: '#ffffff',
        textMuted: '#666666',
        frameGold: '#b8860b',
        frameGoldBright: '#daa520',
        frameBronze: '#cd7f32',
        bloodRed: '#8b0000'
    };

    // Tier colors and frame styles
    const tierConfig = {
        'TIER_3': { color: '#6b6b6b', frameColor: colors.border, icon: null },
        'TIER_2': { color: '#2e8b57', frameColor: '#2e8b57', icon: null },
        'TIER_1': { color: '#4169e1', frameColor: '#4169e1', icon: null },
        'ELITE': { color: '#9932cc', frameColor: colors.frameBronze || '#cd7f32', icon: 'diamond' },
        'BOSS': { color: '#ffd700', frameColor: colors.frameGold || '#b8860b', icon: 'crown' }
    };
    const tierCfg = tierConfig[enemy.tier] || tierConfig['TIER_3'];
    const tierColor = tierCfg.color;
    const frameColor = tierCfg.frameColor;

    ctx.save();

    // === SHADOW for depth ===
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(frame.x + 4, frame.y + 4, frame.width, frame.height);

    // === PANEL BACKGROUND with gradient ===
    const panelGrad = ctx.createLinearGradient(frame.x, frame.y, frame.x, frame.y + frame.height);
    panelGrad.addColorStop(0, colors.bgMedium || '#1a1a24');
    panelGrad.addColorStop(0.3, colors.bgDark || '#12121a');
    panelGrad.addColorStop(1, colors.bgDarkest || '#0a0a0f');
    ctx.fillStyle = panelGrad;
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    // === FRAME BORDER (tier-based styling) ===
    const isBossOrElite = enemy.tier === 'BOSS' || enemy.tier === 'ELITE';

    if (isBossOrElite) {
        // Ornate gold/bronze frame for bosses/elites
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = cfg.frameBorderWidth + 2;
        ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

        ctx.strokeStyle = frameColor;
        ctx.lineWidth = cfg.frameBorderWidth;
        ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

        // Bright inner edge
        ctx.strokeStyle = colors.frameGoldBright || '#daa520';
        ctx.lineWidth = 1;
        ctx.strokeRect(frame.x + cfg.frameBorderWidth, frame.y + cfg.frameBorderWidth,
                       frame.width - cfg.frameBorderWidth * 2, frame.height - cfg.frameBorderWidth * 2);

        // Ornate corners for boss/elite
        if (typeof drawOrnateCorners === 'function') {
            drawOrnateCorners(ctx, frame.x - 2, frame.y - 2, frame.width + 4, frame.height + 4, {
                color: frameColor,
                colorBright: colors.frameGoldBright || '#daa520',
                colorDark: colors.frameGoldDark || '#8b6914',
                size: cfg.frameCornerSize,
                thickness: 2,
                curls: enemy.tier === 'BOSS'
            });
        }
    } else {
        // Simple tier-colored border for regular enemies
        ctx.strokeStyle = tierColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

        // Inner edge
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(frame.x + 3, frame.y + 3, frame.width - 6, frame.height - 6);
    }

    // === TIER INDICATOR (skull/crown/diamond) ===
    if (tierCfg.icon) {
        const indicatorX = frame.x + frame.width - 20;
        const indicatorY = frame.y + 8;

        ctx.fillStyle = tierColor;

        if (tierCfg.icon === 'crown') {
            // Crown for boss
            ctx.beginPath();
            ctx.moveTo(indicatorX - 8, indicatorY + 10);
            ctx.lineTo(indicatorX - 6, indicatorY + 2);
            ctx.lineTo(indicatorX - 2, indicatorY + 6);
            ctx.lineTo(indicatorX + 2, indicatorY);
            ctx.lineTo(indicatorX + 6, indicatorY + 6);
            ctx.lineTo(indicatorX + 8, indicatorY + 2);
            ctx.lineTo(indicatorX + 10, indicatorY + 10);
            ctx.closePath();
            ctx.fill();

            // Crown jewel
            ctx.fillStyle = colors.bloodRed || '#8b0000';
            ctx.beginPath();
            ctx.arc(indicatorX + 2, indicatorY + 5, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (tierCfg.icon === 'diamond') {
            // Diamond for elite
            ctx.beginPath();
            ctx.moveTo(indicatorX, indicatorY);
            ctx.lineTo(indicatorX + 6, indicatorY + 6);
            ctx.lineTo(indicatorX, indicatorY + 12);
            ctx.lineTo(indicatorX - 6, indicatorY + 6);
            ctx.closePath();
            ctx.fill();

            // Inner highlight
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.moveTo(indicatorX, indicatorY + 3);
            ctx.lineTo(indicatorX + 3, indicatorY + 6);
            ctx.lineTo(indicatorX, indicatorY + 8);
            ctx.lineTo(indicatorX - 3, indicatorY + 6);
            ctx.closePath();
            ctx.fill();
        }
    }

    // Inner accent line (top) - blood red for enemy
    ctx.strokeStyle = colors.health || '#c0392b';
    ctx.lineWidth = 2;
    const accentOffset = isBossOrElite ? cfg.frameBorderWidth + 2 : 4;
    ctx.beginPath();
    ctx.moveTo(frame.x + accentOffset, frame.y + accentOffset);
    ctx.lineTo(frame.x + frame.width - accentOffset, frame.y + accentOffset);
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
 * Draw stamina pips (CotDG diamond style) - Basic version
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
 * Draw enhanced stamina pips with StaminaSystem integration
 * Features: segment-based display, regen glow, exhausted flash, refund pulse
 */
function drawStaminaPipsEnhanced(ctx, x, y, staminaState) {
    const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : { segmentCount: 5 };
    const pipSize = 10;
    const pipSpacing = 4;
    const pipsToShow = config.segmentCount || 5;

    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        staminaBright: '#2ecc71',
        stamina: '#27ae60',
        bgLight: '#252530',
        border: '#3a3a4a',
        frameGold: '#b8860b',
        frameGoldBright: '#daa520',
        healthCritical: '#ff3030'
    };

    ctx.save();

    // Get pulse for animations
    const pulse = typeof getPulseValue === 'function' ? getPulseValue(0.004) : 0.5;

    for (let i = 0; i < pipsToShow; i++) {
        const pipX = x + i * (pipSize + pipSpacing);
        const pipY = y;

        const isFilled = i < staminaState.filledSegments;
        const isPartial = i === staminaState.filledSegments && staminaState.segmentPartial > 0;

        // Diamond shape path
        ctx.beginPath();
        ctx.moveTo(pipX + pipSize / 2, pipY);
        ctx.lineTo(pipX + pipSize, pipY + pipSize / 2);
        ctx.lineTo(pipX + pipSize / 2, pipY + pipSize);
        ctx.lineTo(pipX, pipY + pipSize / 2);
        ctx.closePath();

        // Base fill
        if (isFilled) {
            // Full pip
            let fillColor = colors.stamina || '#27ae60';

            // Refund flash (gold pulse)
            if (staminaState.refundFlash) {
                const goldMix = 0.5 + pulse * 0.5;
                ctx.fillStyle = colors.frameGoldBright || '#daa520';
                ctx.shadowColor = colors.frameGold || '#b8860b';
                ctx.shadowBlur = 8;
            } else if (staminaState.isRegenerating) {
                // Regenerating glow
                ctx.shadowColor = colors.staminaBright || '#2ecc71';
                ctx.shadowBlur = 4 + pulse * 4;
                ctx.fillStyle = colors.staminaBright || '#2ecc71';
            } else {
                const staminaGrad = ctx.createLinearGradient(pipX, pipY, pipX, pipY + pipSize);
                staminaGrad.addColorStop(0, colors.staminaBright || '#2ecc71');
                staminaGrad.addColorStop(1, colors.stamina || '#27ae60');
                ctx.fillStyle = staminaGrad;
            }
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (isPartial) {
            // Partial pip - show empty first, then partial fill
            ctx.fillStyle = colors.bgLight || '#252530';
            ctx.fill();

            // Draw partial fill (clip to partial height)
            ctx.save();
            const partialHeight = pipSize * staminaState.segmentPartial;
            ctx.beginPath();
            ctx.rect(pipX - 1, pipY + pipSize - partialHeight, pipSize + 2, partialHeight + 1);
            ctx.clip();

            ctx.beginPath();
            ctx.moveTo(pipX + pipSize / 2, pipY);
            ctx.lineTo(pipX + pipSize, pipY + pipSize / 2);
            ctx.lineTo(pipX + pipSize / 2, pipY + pipSize);
            ctx.lineTo(pipX, pipY + pipSize / 2);
            ctx.closePath();

            const partialGrad = ctx.createLinearGradient(pipX, pipY, pipX, pipY + pipSize);
            partialGrad.addColorStop(0, colors.staminaBright || '#2ecc71');
            partialGrad.addColorStop(1, colors.stamina || '#27ae60');
            ctx.fillStyle = partialGrad;
            ctx.globalAlpha = 0.7;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.restore();
        } else {
            // Empty pip
            ctx.fillStyle = colors.bgLight || '#252530';

            // Exhausted flash (red pulse on empty pips)
            if (staminaState.exhaustedFlash || staminaState.isExhausted) {
                ctx.fillStyle = `rgba(255, 48, 48, ${0.3 + pulse * 0.3})`;
            }
            ctx.fill();
        }

        // Border
        let borderColor = colors.border || '#3a3a4a';
        if (isFilled || isPartial) {
            borderColor = colors.stamina || '#27ae60';
        }
        if (staminaState.isExhausted && !isFilled && !isPartial) {
            borderColor = colors.healthCritical || '#ff3030';
        }
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Exhausted indicator text
    if (staminaState.isExhausted) {
        ctx.font = 'bold 8px Arial';
        ctx.fillStyle = colors.healthCritical || '#ff3030';
        ctx.textAlign = 'left';
        ctx.fillText('LOW', x + (pipsToShow * (pipSize + pipSpacing)) + 4, y + pipSize - 1);
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

        // Check if clicking on a VISIBLE enemy (can't interact with invisible enemies)
        if (game.enemies) {
            const clickedEnemy = game.enemies.find(e =>
                Math.floor(e.gridX) === gridX && Math.floor(e.gridY) === gridY
            );
            if (clickedEnemy) {
                // Only allow interaction if enemy is visible
                const enemyVisible = clickedEnemy.isVisible ||
                    (typeof VisionSystem !== 'undefined' && VisionSystem.getEntityVisibility &&
                     VisionSystem.getEntityVisibility(clickedEnemy.gridX, clickedEnemy.gridY) > 0);
                if (enemyVisible) {
                    return;
                }
                // Enemy is not visible - treat as empty click (fall through to clear target)
            }
        }

        // Check if clicking on VISIBLE merchant/NPC
        if (game.merchant) {
            const mx = game.merchant.x !== undefined ? game.merchant.x : game.merchant.gridX;
            const my = game.merchant.y !== undefined ? game.merchant.y : game.merchant.gridY;
            if (gridX === mx && gridY === my) {
                // Check visibility
                let merchantVisible = true;
                if (typeof VisionSystem !== 'undefined' && VisionSystem.getEntityVisibility) {
                    merchantVisible = VisionSystem.getEntityVisibility(mx, my) > 0;
                }
                if (merchantVisible) {
                    return;
                }
            }
        }

        // Clicking on empty game world - clear target
        if (game.player.combat) {
            game.player.combat.currentTarget = null;
        }
    });

}

// ============================================================================
// STATUS EFFECT RENDERING
// ============================================================================

/**
 * Render status effect icons for an entity
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} entity - Player or enemy
 * @param {number} x - Start X position
 * @param {number} y - Start Y position
 * @param {number} maxWidth - Maximum width for status row
 */
function renderStatusEffects(ctx, entity, x, y, maxWidth) {
    if (!entity || typeof StatusEffectSystem === 'undefined') return;

    const effects = StatusEffectSystem.getEffects(entity);
    if (!effects || effects.length === 0) return;

    const cfg = UNIT_FRAME_CONFIG;
    const iconSize = cfg.statusIconSize;
    const spacing = cfg.statusIconSpacing;
    const maxCols = cfg.statusCols;
    const maxRows = cfg.statusRows;
    const maxIcons = cfg.statusMaxIcons;

    ctx.save();

    // Render each effect (up to max)
    const toRender = effects.slice(0, maxIcons);

    toRender.forEach((effect, index) => {
        const col = index % maxCols;
        const row = Math.floor(index / maxCols);

        if (row >= maxRows) return; // Don't exceed max rows

        const iconX = x + col * (iconSize + spacing);
        const iconY = y + row * (iconSize + spacing);

        renderStatusIcon(ctx, effect, iconX, iconY, iconSize);
    });

    ctx.restore();
}

/**
 * Render a single status effect icon with gem-socket styling
 */
function renderStatusIcon(ctx, effect, x, y, size) {
    const def = effect.definition;
    if (!def) return;

    ctx.save();

    // Get design system colors
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDarkest: '#0d0d0d',
        frameGold: '#b8860b',
        frameGoldDark: '#8b6914'
    };

    // Gem color based on effect type
    let gemColor;
    switch (def.type) {
        case 'buff':
            gemColor = '#2ecc71'; // Emerald green
            break;
        case 'debuff':
            gemColor = '#e74c3c'; // Ruby red
            break;
        case 'dot':
            gemColor = '#e67e22'; // Amber orange
            break;
        case 'cc':
            gemColor = '#9b59b6'; // Amethyst purple
            break;
        case 'heal':
            gemColor = '#1abc9c'; // Teal
            break;
        default:
            gemColor = '#95a5a6'; // Grey
    }

    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const gemRadius = size / 2 - 2;

    // Use gem socket if available
    if (typeof drawGemSocket === 'function') {
        drawGemSocket(ctx, centerX, centerY, gemRadius, {
            fillColor: colors.bgDarkest || '#0d0d0d',
            gemColor: gemColor,
            borderColor: colors.frameGoldDark || '#8b6914',
            glowing: effect.stacks > 1 || (effect.remainingDuration && effect.remainingDuration < 3),
            selected: false
        });
    } else {
        // Fallback: hexagonal gem socket
        const sides = 6;
        ctx.fillStyle = colors.bgDarkest || '#0d0d0d';
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const px = centerX + Math.cos(angle) * (gemRadius + 2);
            const py = centerY + Math.sin(angle) * (gemRadius + 2);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = colors.frameGoldDark || '#8b6914';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner gem with radial gradient
        const gemGrad = ctx.createRadialGradient(
            centerX - gemRadius * 0.2, centerY - gemRadius * 0.2, 0,
            centerX, centerY, gemRadius
        );
        gemGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
        gemGrad.addColorStop(0.3, gemColor);
        gemGrad.addColorStop(1, 'rgba(0,0,0,0.3)');

        ctx.fillStyle = gemGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, gemRadius - 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Icon (emoji or symbol) - on top of gem
    ctx.font = `${size - 6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;
    ctx.fillText(def.icon || '?', centerX, centerY + 1);
    ctx.shadowBlur = 0;

    // Stack count (if > 1) - gold badge in corner
    if (effect.stacks > 1) {
        const badgeX = x + size - 4;
        const badgeY = y + size - 4;

        // Badge background
        ctx.fillStyle = colors.frameGold || '#b8860b';
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Badge border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Stack number
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText(`${effect.stacks}`, badgeX, badgeY);
    }

    // Duration indicator (arc around gem)
    if (def.duration && effect.remainingDuration) {
        const pct = effect.remainingDuration / def.duration;
        if (pct < 1) {
            // Glowing duration arc
            ctx.strokeStyle = gemColor;
            ctx.lineWidth = 2;
            ctx.shadowColor = gemColor;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(centerX, centerY, gemRadius + 3,
                    -Math.PI / 2,
                    -Math.PI / 2 + (pct * Math.PI * 2));
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Warning pulse when low duration
            if (pct < 0.25) {
                const pulse = typeof getPulseValue === 'function' ? getPulseValue(0.008) : 0.5;
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + pulse * 0.4})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(centerX, centerY, gemRadius + 5, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    ctx.restore();
}

/**
 * Render status effects below player frame
 */
function renderPlayerStatusEffects(ctx) {
    if (!game.player) return;

    const cfg = UNIT_FRAME_CONFIG;
    const frame = cfg.player;

    // Position below the player frame
    const statusX = frame.x + cfg.portraitPadding;
    const statusY = frame.y + frame.height + 4;
    const maxWidth = frame.width - cfg.portraitPadding * 2;

    renderStatusEffects(ctx, game.player, statusX, statusY, maxWidth);
}

/**
 * Render status effects below enemy frame
 */
function renderEnemyStatusEffects(ctx, enemy) {
    if (!enemy) return;

    const cfg = UNIT_FRAME_CONFIG;
    const frame = cfg.enemy;

    // Position below the enemy frame
    const statusX = frame.x + cfg.portraitPadding;
    const statusY = frame.y + frame.height + 4;
    const maxWidth = frame.width - cfg.portraitPadding * 2;

    renderStatusEffects(ctx, enemy, statusX, statusY, maxWidth);
}

// ============================================================================
// BOON HUD ICONS
// ============================================================================

// Boon tooltip hover state
const _boonHoverState = {
    hoveredBoonIndex: -1,
    iconPositions: []   // Array of { x, y, w, h } for hit testing
};

/**
 * Render boon icons in the player HUD area
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Start X position
 * @param {number} y - Start Y position
 */
function renderBoonIcons(ctx, x, y) {
    if (typeof BoonSystem === 'undefined' || !BoonSystem.activeBoons) return;

    const boonList = BoonSystem.getActiveBoonList();
    if (boonList.length === 0) return;

    const ICON_SIZE = 20;
    const ICON_SPACING = 2;
    const ANCESTORS_REF = typeof ANCESTORS !== 'undefined' ? ANCESTORS : {};

    // Reset icon positions for hit testing
    _boonHoverState.iconPositions = [];

    ctx.save();

    boonList.forEach((entry, i) => {
        const boon = entry.boon;
        const iconX = x + i * (ICON_SIZE + ICON_SPACING);
        const iconY = y;

        // Store position for tooltip hit testing
        _boonHoverState.iconPositions.push({ x: iconX, y: iconY, w: ICON_SIZE, h: ICON_SIZE });

        // Background with ancestor color
        const ancestor = boon.ancestor ? ANCESTORS_REF[boon.ancestor] : null;
        const color = ancestor ? ancestor.color : '#888';

        ctx.fillStyle = color + 'CC'; // 80% opacity
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(iconX, iconY, ICON_SIZE, ICON_SIZE, 2);
        } else {
            ctx.rect(iconX, iconY, ICON_SIZE, ICON_SIZE);
        }
        ctx.fill();

        // Tier border
        const tierColors = {
            'core': 'rgba(255,255,255,0.5)',
            'resonance': '#4488cc',
            'legendary': '#aa44dd'
        };
        ctx.strokeStyle = tierColors[boon.tier] || tierColors['core'];
        ctx.lineWidth = 1;
        ctx.stroke();

        // Highlight if hovered
        if (i === _boonHoverState.hoveredBoonIndex) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // First letter of boon name as icon text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(boon.name.charAt(0), iconX + ICON_SIZE / 2, iconY + ICON_SIZE / 2);

        // Stack indicator
        if (entry.stacks > 1) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText('x' + entry.stacks, iconX + ICON_SIZE, iconY);
        }
    });

    // Synergy indicator - gold underline for ancestor groups with 3+ boons
    if (typeof BoonSystem !== 'undefined') {
        // Group boon indices by ancestor
        const groups = {};
        boonList.forEach((entry, i) => {
            const ancestorId = entry.boon.ancestor;
            if (!ancestorId) return;
            if (!groups[ancestorId]) groups[ancestorId] = [];
            groups[ancestorId].push(i);
        });

        // Check synergy thresholds
        for (const [ancestorId, indices] of Object.entries(groups)) {
            const ancestor = ANCESTORS_REF[ancestorId];
            const threshold = ancestor ? (ancestor.synergyThreshold || 3) : 3;
            if (indices.length >= threshold && ancestor && ancestor.synergyBonus) {
                const startX = x + indices[0] * (ICON_SIZE + ICON_SPACING);
                const endX = x + indices[indices.length - 1] * (ICON_SIZE + ICON_SPACING) + ICON_SIZE;
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(startX, y + ICON_SIZE + 2);
                ctx.lineTo(endX, y + ICON_SIZE + 2);
                ctx.stroke();
            }
        }
    }

    ctx.restore();
}

/**
 * Handle mouse move for boon icon tooltip
 * Call this from the game's mousemove handler
 * @param {number} mouseX - Canvas X coordinate
 * @param {number} mouseY - Canvas Y coordinate
 */
function handleBoonIconHover(mouseX, mouseY) {
    _boonHoverState.hoveredBoonIndex = -1;

    for (let i = 0; i < _boonHoverState.iconPositions.length; i++) {
        const pos = _boonHoverState.iconPositions[i];
        if (mouseX >= pos.x && mouseX <= pos.x + pos.w &&
            mouseY >= pos.y && mouseY <= pos.y + pos.h) {
            _boonHoverState.hoveredBoonIndex = i;
            break;
        }
    }
}

/**
 * Render boon tooltip when hovering over a boon icon
 * @param {CanvasRenderingContext2D} ctx
 */
function renderBoonTooltip(ctx) {
    if (_boonHoverState.hoveredBoonIndex < 0) return;
    if (typeof BoonSystem === 'undefined') return;

    const boonList = BoonSystem.getActiveBoonList();
    if (_boonHoverState.hoveredBoonIndex >= boonList.length) return;

    const entry = boonList[_boonHoverState.hoveredBoonIndex];
    const boon = entry.boon;
    if (!boon) return;

    const pos = _boonHoverState.iconPositions[_boonHoverState.hoveredBoonIndex];
    if (!pos) return;

    const ANCESTORS_REF = typeof ANCESTORS !== 'undefined' ? ANCESTORS : {};
    const ancestor = boon.ancestor ? ANCESTORS_REF[boon.ancestor] : null;

    ctx.save();

    // Tooltip dimensions
    const tooltipW = 220;
    const tooltipH = 80;
    const tooltipX = Math.max(5, pos.x - 10);
    const tooltipY = pos.y + pos.h + 6;

    // Background
    ctx.fillStyle = 'rgba(15, 12, 25, 0.95)';
    ctx.fillRect(tooltipX, tooltipY, tooltipW, tooltipH);

    // Border
    ctx.strokeStyle = boon.color || '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(tooltipX, tooltipY, tooltipW, tooltipH);

    // Boon name
    ctx.fillStyle = boon.color || '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText((boon.icon || '') + ' ' + boon.name, tooltipX + 8, tooltipY + 6);

    // Ancestor + Tier
    const ancestorName = ancestor ? ancestor.name : 'Unknown';
    const tierLabel = (boon.tier || 'core').charAt(0).toUpperCase() + (boon.tier || 'core').slice(1);
    ctx.fillStyle = ancestor ? ancestor.color : '#888';
    ctx.font = '10px monospace';
    ctx.fillText(ancestorName + ' - ' + tierLabel, tooltipX + 8, tooltipY + 24);

    // Stacks
    if (entry.stacks > 1) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Stacks: ' + entry.stacks + '/' + (boon.maxStacks || 1), tooltipX + 8, tooltipY + 38);
    }

    // Description
    ctx.fillStyle = '#BBBBBB';
    ctx.font = '10px monospace';
    const desc = boon.description || '';
    const descY = entry.stacks > 1 ? tooltipY + 52 : tooltipY + 38;
    ctx.fillText(desc.substring(0, 32), tooltipX + 8, descY);
    if (desc.length > 32) {
        ctx.fillText(desc.substring(32, 64), tooltipX + 8, descY + 13);
    }

    ctx.restore();
}

// Initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('load', initUnitFrameHandlers);

    // Add mousemove handler for boon icon tooltips
    window.addEventListener('load', () => {
        const gameCanvas = document.getElementById('gameCanvas');
        if (gameCanvas) {
            gameCanvas.addEventListener('mousemove', (e) => {
                const rect = gameCanvas.getBoundingClientRect();
                const scaleX = gameCanvas.width / rect.width;
                const scaleY = gameCanvas.height / rect.height;
                const mouseX = (e.clientX - rect.left) * scaleX;
                const mouseY = (e.clientY - rect.top) * scaleY;
                handleBoonIconHover(mouseX, mouseY);
            });
        }
    });
}

// Export
window.renderUnitFrames = renderUnitFrames;
window.UNIT_FRAME_CONFIG = UNIT_FRAME_CONFIG;
window.renderStatusEffects = renderStatusEffects;
window.renderPlayerStatusEffects = renderPlayerStatusEffects;
window.renderEnemyStatusEffects = renderEnemyStatusEffects;
window.renderBoonIcons = renderBoonIcons;
window.handleBoonIconHover = handleBoonIconHover;
window.renderBoonTooltip = renderBoonTooltip;

// Unit frames loaded
