// ============================================================================
// CHARACTER OVERLAY - CotDG Inspired Stats Panel
// ============================================================================
// Opens from sidebar character icon with stylized dark temple aesthetic
// ============================================================================

/**
 * Draw the character overlay - CotDG style
 */
function drawCharacterOverlay() {
    if (!game.player) return;

    // Get colors from design system
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDarkest: '#0a0a0f',
        bgDark: '#12121a',
        bgMedium: '#1a1a24',
        border: '#3a3a4a',
        health: '#c0392b',
        healthDark: '#8b1a1a',
        mana: '#2980b9',
        manaDark: '#1a3a5c',
        stamina: '#27ae60',
        staminaDark: '#1a4a2e',
        gold: '#d4af37',
        xp: '#5dade2',
        corruption: '#8e44ad',
        textPrimary: '#ffffff',
        textSecondary: '#b0b0b0',
        textMuted: '#666666'
    };

    // Background overlay (dark vignette)
    const vignetteGrad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
        canvas.width / 2, canvas.height / 2, canvas.height
    );
    vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);

    // Panel dimensions
    const panelWidth = Math.min(500, canvas.width - TRACKER_WIDTH - 100);
    const panelHeight = Math.min(700, canvas.height - 80);
    const panelX = TRACKER_WIDTH + 30;
    const panelY = (canvas.height - panelHeight) / 2;

    // === PANEL BACKGROUND ===
    drawOverlayPanel(ctx, panelX, panelY, panelWidth, panelHeight, colors);

    let yOffset = panelY + 30;
    const contentX = panelX + 30;
    const contentWidth = panelWidth - 60;

    // === HEADER ===
    // Title with decorative line
    ctx.fillStyle = colors.health || '#c0392b';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHARACTER', panelX + panelWidth / 2, yOffset);

    yOffset += 15;
    drawDecorativeLine(ctx, panelX + 60, yOffset, panelWidth - 120, colors);
    yOffset += 25;

    // Character name and level
    ctx.fillStyle = colors.gold || '#d4af37';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('ADVENTURER', panelX + panelWidth / 2, yOffset);
    yOffset += 25;

    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText(`Level ${game.player.level}`, panelX + panelWidth / 2, yOffset);
    yOffset += 20;

    // === XP BAR ===
    const xpNeeded = 100 + (game.player.level - 1) * 150;
    drawStylizedResourceBar(ctx, contentX, yOffset, contentWidth, 14,
        game.player.xp, xpNeeded, colors.xp || '#5dade2', '#1a3a5c', colors, 'XP');
    yOffset += 40;

    // === VITALS SECTION ===
    drawSectionHeader(ctx, panelX + panelWidth / 2, yOffset, 'VITALS', colors);
    yOffset += 30;

    // HP Bar
    drawStylizedResourceBar(ctx, contentX, yOffset, contentWidth, 18,
        Math.floor(game.player.hp), game.player.maxHp,
        colors.health || '#c0392b', colors.healthDark || '#8b1a1a', colors, 'HP');
    yOffset += 35;

    // MP Bar
    const mp = Math.floor(game.player.mp || 0);
    const maxMp = game.player.maxMp || 100;
    drawStylizedResourceBar(ctx, contentX, yOffset, contentWidth, 18,
        mp, maxMp, colors.mana || '#2980b9', colors.manaDark || '#1a3a5c', colors, 'MP');
    yOffset += 35;

    // Stamina Bar
    drawStylizedResourceBar(ctx, contentX, yOffset, contentWidth, 18,
        Math.floor(game.player.stamina), game.player.maxStamina,
        colors.stamina || '#27ae60', colors.staminaDark || '#1a4a2e', colors, 'STM');
    yOffset += 50;

    // === ATTRIBUTES SECTION ===
    drawSectionHeader(ctx, panelX + panelWidth / 2, yOffset, 'ATTRIBUTES', colors);
    yOffset += 35;

    const col1X = contentX + 20;
    const col2X = contentX + contentWidth / 2 + 20;

    // Primary stats (left column)
    drawStatRow(ctx, col1X, yOffset, 'STR', game.player.stats.STR, colors);
    drawStatRow(ctx, col2X, yOffset, 'P.DEF', Math.floor(game.player.pDef), colors);
    yOffset += 28;

    drawStatRow(ctx, col1X, yOffset, 'AGI', game.player.stats.AGI, colors);
    drawStatRow(ctx, col2X, yOffset, 'M.DEF', Math.floor(game.player.mDef), colors);
    yOffset += 28;

    drawStatRow(ctx, col1X, yOffset, 'INT', game.player.stats.INT, colors);
    yOffset += 28;

    drawStatRow(ctx, col1X, yOffset, 'STA', game.player.stats.STA, colors);
    yOffset += 45;

    // === EQUIPMENT SECTION ===
    drawSectionHeader(ctx, panelX + panelWidth / 2, yOffset, 'EQUIPMENT', colors);
    yOffset += 35;

    const eq = game.player.equipped;
    const slots = [
        { key: 'HEAD', label: 'Head' },
        { key: 'CHEST', label: 'Chest' },
        { key: 'LEGS', label: 'Legs' },
        { key: 'FEET', label: 'Feet' },
        { key: 'MAIN', label: 'Main' },
        { key: 'OFF', label: 'Off' }
    ];

    for (const slot of slots) {
        drawEquipmentSlot(ctx, contentX, yOffset, contentWidth, slot, eq[slot.key], colors);
        yOffset += 26;
    }

    yOffset += 15;

    // === GOLD DISPLAY ===
    ctx.fillStyle = colors.gold || '#d4af37';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';

    // Gold icon (simple coin shape)
    const goldX = panelX + panelWidth / 2;
    ctx.beginPath();
    ctx.arc(goldX - 60, yOffset - 5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.bgDark || '#12121a';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('G', goldX - 60, yOffset - 1);

    ctx.fillStyle = colors.gold || '#d4af37';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(game.gold.toLocaleString(), goldX + 10, yOffset);

    // === FOOTER INSTRUCTIONS ===
    ctx.fillStyle = colors.textMuted || '#666666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ESC/C] Close  |  [E] Inventory  |  [K] Skills', panelX + panelWidth / 2, panelY + panelHeight - 20);
}

/**
 * Draw a stylized overlay panel
 */
function drawOverlayPanel(ctx, x, y, width, height, colors) {
    ctx.save();

    // Panel shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    // Main background gradient
    const bgGrad = ctx.createLinearGradient(x, y, x, y + height);
    bgGrad.addColorStop(0, colors.bgMedium || '#1a1a24');
    bgGrad.addColorStop(0.5, colors.bgDark || '#12121a');
    bgGrad.addColorStop(1, colors.bgDarkest || '#0a0a0f');
    ctx.fillStyle = bgGrad;

    // Rounded corners
    const radius = 8;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = colors.border || '#3a3a4a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner highlight (top edge)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + radius + 5, y + 2);
    ctx.lineTo(x + width - radius - 5, y + 2);
    ctx.stroke();

    // Corner accents
    const accentSize = 15;
    ctx.strokeStyle = colors.health || '#c0392b';
    ctx.lineWidth = 2;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + accentSize);
    ctx.lineTo(x, y);
    ctx.lineTo(x + accentSize, y);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + width - accentSize, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + accentSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + height - accentSize);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + accentSize, y + height);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + width - accentSize, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width, y + height - accentSize);
    ctx.stroke();

    ctx.restore();
}

/**
 * Draw a decorative horizontal line
 */
function drawDecorativeLine(ctx, x, y, width, colors) {
    const centerX = x + width / 2;

    // Main line
    ctx.strokeStyle = colors.border || '#3a3a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();

    // Center diamond accent
    ctx.fillStyle = colors.health || '#c0392b';
    ctx.save();
    ctx.translate(centerX, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();

    // Side dots
    ctx.beginPath();
    ctx.arc(x + 10, y, 2, 0, Math.PI * 2);
    ctx.arc(x + width - 10, y, 2, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Draw a section header
 */
function drawSectionHeader(ctx, centerX, y, text, colors) {
    ctx.fillStyle = colors.health || '#c0392b';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, centerX, y);

    // Underline
    const textWidth = ctx.measureText(text).width;
    ctx.strokeStyle = colors.health || '#c0392b';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(centerX - textWidth / 2 - 10, y + 8);
    ctx.lineTo(centerX + textWidth / 2 + 10, y + 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

/**
 * Draw a stylized resource bar
 */
function drawStylizedResourceBar(ctx, x, y, width, height, current, max, fillColor, bgColor, colors, label) {
    const pct = Math.max(0, Math.min(1, current / max));

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);

    // Fill with gradient
    if (pct > 0) {
        const fillGrad = ctx.createLinearGradient(x, y, x + width * pct, y);
        fillGrad.addColorStop(0, fillColor);
        fillGrad.addColorStop(1, bgColor);
        ctx.fillStyle = fillGrad;
        ctx.fillRect(x, y, width * pct, height);

        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, width * pct, height / 3);
    }

    // Border
    ctx.strokeStyle = colors.border || '#3a3a4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Label
    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 5, y + height - 3);

    // Value
    ctx.textAlign = 'right';
    ctx.fillText(`${current}/${max}`, x + width - 5, y + height - 3);
}

/**
 * Draw a stat row
 */
function drawStatRow(ctx, x, y, label, value, colors) {
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';

    ctx.fillStyle = colors.textSecondary || '#b0b0b0';
    ctx.fillText(label + ':', x, y);

    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.fillText(value.toString(), x + 60, y);
}

/**
 * Draw an equipment slot
 */
function drawEquipmentSlot(ctx, x, y, width, slot, item, colors) {
    // Slot background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x, y - 14, width, 22);

    // Slot label
    ctx.fillStyle = colors.gold || '#d4af37';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(slot.label + ':', x + 5, y);

    // Item name (with tier color if available)
    if (item && item.name) {
        const tierColor = item.tierColor || colors.textPrimary || '#ffffff';
        ctx.fillStyle = tierColor;
        ctx.font = '12px monospace';

        // Truncate name if too long
        let name = item.name;
        if (name.length > 25) {
            name = name.substring(0, 22) + '...';
        }
        ctx.fillText(name, x + 70, y);
    } else {
        ctx.fillStyle = colors.textMuted || '#666666';
        ctx.fillText('Empty', x + 70, y);
    }
}

// Export
window.drawCharacterOverlay = drawCharacterOverlay;
window.drawOverlayPanel = drawOverlayPanel;

console.log('Character overlay loaded (CotDG style)');
