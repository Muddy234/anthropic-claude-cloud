// ============================================================================
// CHARACTER OVERLAY - Stats, equipment, and character info
// ============================================================================
// Opens from sidebar character icon, slides from left edge
// ============================================================================

/**
 * Draw the character overlay
 */
function drawCharacterOverlay() {
    if (!game.player) return;

    // Background overlay (semi-transparent)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);

    // Panel dimensions
    const panelWidth = Math.min(600, canvas.width - TRACKER_WIDTH - 100);
    const panelHeight = Math.min(800, canvas.height - 80);
    const panelX = TRACKER_WIDTH + 20; // Slide from sidebar edge
    const panelY = (canvas.height - panelHeight) / 2;

    // Panel background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Panel border
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 4;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Title
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHARACTER', panelX + panelWidth / 2, panelY + 50);

    // Character name and level
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('ADVENTURER', panelX + panelWidth / 2, panelY + 90);

    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.fillText(`Level ${game.player.level}`, panelX + panelWidth / 2, panelY + 115);

    // XP Bar
    const xpBarX = panelX + 50;
    const xpBarY = panelY + 130;
    const xpBarWidth = panelWidth - 100;
    const xpNeeded = 100 + (game.player.level - 1) * 150;
    const xpPct = Math.min(1, game.player.xp / xpNeeded);

    ctx.fillStyle = '#333';
    ctx.fillRect(xpBarX, xpBarY, xpBarWidth, 15);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(xpBarX, xpBarY, xpBarWidth * xpPct, 15);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(xpBarX, xpBarY, xpBarWidth, 15);

    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${game.player.xp} / ${xpNeeded} XP`, panelX + panelWidth / 2, xpBarY + 30);

    let yOffset = panelY + 180;

    // Stats section (two columns)
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STATS', panelX + panelWidth / 2, yOffset);
    yOffset += 35;

    const col1X = panelX + panelWidth / 3;
    const col2X = panelX + (panelWidth * 2) / 3;

    ctx.fillStyle = '#fff';
    ctx.font = '18px monospace';
    ctx.textAlign = 'center';

    // Column 1: Base stats
    ctx.fillText(`STR: ${game.player.stats.STR}`, col1X, yOffset);
    ctx.fillText(`P.DEF: ${Math.floor(game.player.pDef)}`, col2X, yOffset);
    yOffset += 30;

    ctx.fillText(`AGI: ${game.player.stats.AGI}`, col1X, yOffset);
    ctx.fillText(`M.DEF: ${Math.floor(game.player.mDef)}`, col2X, yOffset);
    yOffset += 30;

    ctx.fillText(`INT: ${game.player.stats.INT}`, col1X, yOffset);
    yOffset += 30;

    ctx.fillText(`STA: ${game.player.stats.STA}`, col1X, yOffset);
    yOffset += 50;

    // Resource bars
    const barX = panelX + 50;
    const barWidth = panelWidth - 100;
    const barHeight = 20;

    // HP
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${Math.floor(game.player.hp)}/${game.player.maxHp}`, barX, yOffset);
    yOffset += 5;

    const hpPct = game.player.hp / game.player.maxHp;
    ctx.fillStyle = '#3a1515';
    ctx.fillRect(barX, yOffset, barWidth, barHeight);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(barX, yOffset, barWidth * hpPct, barHeight);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, yOffset, barWidth, barHeight);
    yOffset += 30;

    // MP
    const mp = Math.floor(game.player.mp || 0);
    const maxMp = game.player.maxMp || 100;
    ctx.fillText(`MP: ${mp}/${maxMp}`, barX, yOffset);
    yOffset += 5;

    const mpPct = mp / maxMp;
    ctx.fillStyle = '#15233a';
    ctx.fillRect(barX, yOffset, barWidth, barHeight);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(barX, yOffset, barWidth * mpPct, barHeight);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(barX, yOffset, barWidth, barHeight);
    yOffset += 30;

    // Stamina
    ctx.fillText(`STM: ${Math.floor(game.player.stamina)}/${game.player.maxStamina}`, barX, yOffset);
    yOffset += 50;

    // Equipment section
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EQUIPMENT', panelX + panelWidth / 2, yOffset);
    yOffset += 30;

    const eq = game.player.equipped;
    const slots = [
        { key: 'HEAD', label: 'Head' },
        { key: 'CHEST', label: 'Chest' },
        { key: 'LEGS', label: 'Legs' },
        { key: 'FEET', label: 'Feet' },
        { key: 'MAIN', label: 'Main Hand' },
        { key: 'OFF', label: 'Off Hand' }
    ];

    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    const eqX = panelX + 50;

    for (const slot of slots) {
        ctx.fillStyle = '#f1c40f';
        ctx.fillText(`${slot.label}:`, eqX, yOffset);

        const item = eq[slot.key];
        ctx.fillStyle = item ? '#fff' : '#666';
        ctx.fillText(item ? item.name : 'Empty', eqX + 150, yOffset);
        yOffset += 25;
    }

    // Gold
    yOffset += 20;
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`GOLD: ${game.gold}`, panelX + panelWidth / 2, yOffset);

    // Instructions
    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
    ctx.fillText('[ESC] Close  |  [E] Inventory', panelX + panelWidth / 2, panelY + panelHeight - 20);
}

// Export
window.drawCharacterOverlay = drawCharacterOverlay;

console.log('✅ Character overlay loaded');
