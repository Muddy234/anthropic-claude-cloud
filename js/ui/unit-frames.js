// ============================================================================
// UNIT FRAMES - WoW-style player and enemy frames
// ============================================================================
// Displays player and enemy portraits with HP, MP, and status effects
// ============================================================================

// Unit frame configuration
const UNIT_FRAME_CONFIG = {
    // Player frame (top-left)
    player: {
        x: 90,  // Start after sidebar
        y: 20,
        width: 250,
        height: 90
    },
    // Enemy frame (next to player)
    enemy: {
        x: 360,  // Next to player frame
        y: 20,
        width: 250,
        height: 90
    },
    // Portrait
    portraitSize: 60,
    portraitPadding: 8,
    // Bars
    barHeight: 18,
    barSpacing: 4,
    // Status effects
    statusIconSize: 20,
    statusIconSpacing: 2,
    statusMaxIcons: 10,
    statusRows: 2,
    statusCols: 5,
    // Colors
    bgColor: 'rgba(20, 20, 20, 0.85)',
    borderColor: '#444',
    hpColor: '#e74c3c',
    hpBgColor: '#3a1515',
    mpColor: '#3498db',
    mpBgColor: '#15233a',
    textColor: '#ffffff',
    levelColor: '#f1c40f'
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
 * Render player unit frame
 */
function renderPlayerFrame(ctx) {
    const cfg = UNIT_FRAME_CONFIG;
    const frame = cfg.player;
    const player = game.player;

    // Background
    ctx.fillStyle = cfg.bgColor;
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    // Border
    ctx.strokeStyle = cfg.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    // Portrait (circular)
    const portraitX = frame.x + cfg.portraitPadding + cfg.portraitSize / 2;
    const portraitY = frame.y + frame.height / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(portraitX, portraitY, cfg.portraitSize / 2, 0, Math.PI * 2);
    ctx.clip();

    // Portrait background (player color)
    ctx.fillStyle = '#2ecc71';
    ctx.fill();

    // Portrait icon
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('😊', portraitX, portraitY);

    ctx.restore();

    // Portrait border
    ctx.strokeStyle = cfg.borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(portraitX, portraitY, cfg.portraitSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Name and level
    const textX = frame.x + cfg.portraitPadding * 2 + cfg.portraitSize + 5;
    const textY = frame.y + 15;

    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = cfg.textColor;
    ctx.fillText('PLAYER', textX, textY);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = cfg.levelColor;
    ctx.fillText(`Lv ${player.level}`, textX + 70, textY);

    // HP Bar
    const barX = textX;
    const barY = textY + 10;
    const barWidth = frame.width - (cfg.portraitPadding * 2 + cfg.portraitSize + 15);

    drawResourceBar(ctx, barX, barY, barWidth, cfg.barHeight,
                    player.hp, player.maxHp, cfg.hpColor, cfg.hpBgColor, 'HP');

    // MP Bar
    const mpBarY = barY + cfg.barHeight + cfg.barSpacing;
    drawResourceBar(ctx, barX, mpBarY, barWidth, cfg.barHeight,
                    player.mp, player.maxMp, cfg.mpColor, cfg.mpBgColor, 'MP');

    // Status effects (below bars)
    const statusY = frame.y + frame.height - cfg.statusIconSize - 5;
    renderStatusEffects(ctx, barX, statusY, player.statusEffects || []);
}

/**
 * Render enemy unit frame
 */
function renderEnemyFrame(ctx, enemy) {
    const cfg = UNIT_FRAME_CONFIG;
    const frame = cfg.enemy;

    // Background
    ctx.fillStyle = cfg.bgColor;
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    // Border (red for hostile)
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    // Portrait (circular)
    const portraitX = frame.x + cfg.portraitPadding + cfg.portraitSize / 2;
    const portraitY = frame.y + frame.height / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(portraitX, portraitY, cfg.portraitSize / 2, 0, Math.PI * 2);
    ctx.clip();

    // Portrait background (enemy color)
    ctx.fillStyle = '#e74c3c';
    ctx.fill();

    // Try to draw enemy sprite
    let spriteDrawn = false;
    if (typeof getEnemySpriteFrame === 'function') {
        const frameData = getEnemySpriteFrame(enemy);
        if (frameData) {
            const scale = cfg.portraitSize / Math.max(frameData.frameWidth, frameData.frameHeight);
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

    // Fallback: emoji
    if (!spriteDrawn) {
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('👹', portraitX, portraitY);
    }

    ctx.restore();

    // Portrait border
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(portraitX, portraitY, cfg.portraitSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Name and level
    const textX = frame.x + cfg.portraitPadding * 2 + cfg.portraitSize + 5;
    const textY = frame.y + 15;

    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = cfg.textColor;
    const enemyName = enemy.name || 'Enemy';
    ctx.fillText(enemyName.substring(0, 15), textX, textY);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = cfg.levelColor;
    ctx.fillText(`Lv ${enemy.level || 1}`, textX + 120, textY);

    // HP Bar
    const barX = textX;
    const barY = textY + 10;
    const barWidth = frame.width - (cfg.portraitPadding * 2 + cfg.portraitSize + 15);

    drawResourceBar(ctx, barX, barY, barWidth, cfg.barHeight,
                    enemy.hp, enemy.maxHp, cfg.hpColor, cfg.hpBgColor, 'HP');

    // Enemy has no MP bar, but show tier/type
    const typeY = barY + cfg.barHeight + cfg.barSpacing;
    ctx.font = '11px monospace';
    ctx.fillStyle = '#888';
    const tierIndicator = enemy.tierIndicator || '';
    const element = enemy.element || 'physical';
    ctx.fillText(`${tierIndicator} ${element}`, barX, typeY + 10);

    // Status effects (below bars)
    const statusY = frame.y + frame.height - cfg.statusIconSize - 5;
    renderStatusEffects(ctx, barX, statusY, enemy.statusEffects || []);
}

/**
 * Draw a resource bar (HP/MP)
 */
function drawResourceBar(ctx, x, y, width, height, current, max, color, bgColor, label) {
    const pct = Math.max(0, Math.min(1, current / max));

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);

    // Fill
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * pct, height);

    // Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Text
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText(`${Math.ceil(current)}/${max}`, x + width / 2, y + height / 2);
    ctx.shadowBlur = 0;
}

/**
 * Render status effect icons (2 rows of 5)
 */
function renderStatusEffects(ctx, x, y, effects) {
    const cfg = UNIT_FRAME_CONFIG;
    const maxDisplay = Math.min(effects.length, cfg.statusMaxIcons);

    for (let i = 0; i < maxDisplay; i++) {
        const row = Math.floor(i / cfg.statusCols);
        const col = i % cfg.statusCols;
        const iconX = x + col * (cfg.statusIconSize + cfg.statusIconSpacing);
        const iconY = y + row * (cfg.statusIconSize + cfg.statusIconSpacing);

        const effect = effects[i];
        drawStatusIcon(ctx, iconX, iconY, cfg.statusIconSize, effect);
    }
}

/**
 * Draw a single status effect icon
 */
function drawStatusIcon(ctx, x, y, size, effect) {
    // Background
    const isDebuff = effect.type === 'debuff' || effect.harmful;
    ctx.fillStyle = isDebuff ? 'rgba(231, 76, 60, 0.3)' : 'rgba(46, 204, 113, 0.3)';
    ctx.fillRect(x, y, size, size);

    // Border
    ctx.strokeStyle = isDebuff ? '#e74c3c' : '#2ecc71';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);

    // Icon (use emoji or first letter)
    const iconMap = {
        'burning': '🔥',
        'frozen': '❄️',
        'poisoned': '☠️',
        'bleeding': '🩸',
        'stunned': '💫',
        'slowed': '🐌',
        'haste': '⚡',
        'strength': '💪',
        'defense': '🛡️',
        'regeneration': '💚'
    };

    const icon = iconMap[effect.name?.toLowerCase()] || effect.name?.charAt(0) || '?';

    ctx.font = `${size - 6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(icon, x + size / 2, y + size / 2);
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
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Check if clicking in game world area (not sidebar, not action bar, not other UI)
        const cfg = UNIT_FRAME_CONFIG;
        const inSidebar = clickX < TRACKER_WIDTH;
        const inPlayerFrame = clickX >= cfg.player.x && clickX <= cfg.player.x + cfg.player.width &&
                              clickY >= cfg.player.y && clickY <= cfg.player.y + cfg.player.height;
        const inEnemyFrame = clickX >= cfg.enemy.x && clickX <= cfg.enemy.x + cfg.enemy.width &&
                             clickY >= cfg.enemy.y && clickY <= cfg.enemy.y + cfg.enemy.height;

        // Action bar area (bottom-right)
        const actionBarY = canvas.height - 100;
        const inActionBar = clickY >= actionBarY && clickX >= canvas.width - 300;

        // If clicking in game world (not UI), clear target
        if (!inSidebar && !inPlayerFrame && !inEnemyFrame && !inActionBar) {
            if (game.player.combat) {
                game.player.combat.currentTarget = null;
            }
        }
    });

    console.log('✅ Unit frame handlers initialized');
}

// Initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('load', initUnitFrameHandlers);
}

// Export
window.renderUnitFrames = renderUnitFrames;
window.UNIT_FRAME_CONFIG = UNIT_FRAME_CONFIG;

console.log('✅ Unit frames loaded');
