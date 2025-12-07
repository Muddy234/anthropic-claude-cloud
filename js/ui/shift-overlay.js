// ============================================================================
// SHIFT OVERLAY - Dynamic shift information display
// ============================================================================
// Displays floor lore, shift mechanics, active bonuses, and win conditions
// ============================================================================

/**
 * Draw the shift overlay
 */
function drawShiftOverlay() {
    const shiftInfo = typeof getCurrentShiftInfo === 'function' ? getCurrentShiftInfo() : null;
    if (!shiftInfo) {
        drawShiftOverlayPlaceholder();
        return;
    }

    // Background overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);

    // Panel dimensions
    const panelWidth = Math.min(800, canvas.width - TRACKER_WIDTH - 60);
    const panelHeight = Math.min(700, canvas.height - 60);
    const panelX = TRACKER_WIDTH + (canvas.width - TRACKER_WIDTH - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;

    // Panel background with gradient
    const gradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Panel border - changes color based on shift status
    const borderColor = game.shiftActive ? '#e74c3c' : '#f39c12';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Content area with padding
    const contentX = panelX + 40;
    const contentWidth = panelWidth - 80;
    let y = panelY + 50;

    // Title with warning icon
    ctx.fillStyle = borderColor;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`⚠️ ${shiftInfo.name} ⚠️`, panelX + panelWidth / 2, y);
    y += 20;

    // Floor indicator
    ctx.fillStyle = '#888';
    ctx.font = '16px monospace';
    ctx.fillText(`Floor ${game.floor || 1}`, panelX + panelWidth / 2, y);
    y += 40;

    // Countdown timer display
    drawShiftTimer(panelX + panelWidth / 2, y);
    y += 60;

    // Divider
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(contentX, y);
    ctx.lineTo(contentX + contentWidth, y);
    ctx.stroke();
    y += 30;

    // Lore section
    if (shiftInfo.lore) {
        ctx.fillStyle = '#f39c12';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(shiftInfo.lore.title, contentX, y);
        y += 30;

        ctx.fillStyle = '#ccc';
        ctx.font = '14px monospace';

        for (const paragraph of shiftInfo.lore.paragraphs) {
            y = drawWrappedText(ctx, paragraph, contentX, y, contentWidth, 20);
            y += 15;
        }
        y += 10;
    }

    // Divider
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(contentX, y);
    ctx.lineTo(contentX + contentWidth, y);
    ctx.stroke();
    y += 25;

    // Mechanics section
    if (shiftInfo.mechanics) {
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(shiftInfo.mechanics.title, contentX, y);
        y += 25;

        ctx.fillStyle = '#aaa';
        ctx.font = '14px monospace';
        y = drawWrappedText(ctx, shiftInfo.mechanics.description, contentX, y, contentWidth, 18);
        y += 20;

        // Mechanics details as bullet points
        ctx.fillStyle = '#888';
        for (const detail of shiftInfo.mechanics.details) {
            ctx.fillText(`  • ${detail}`, contentX, y);
            y += 22;
        }
        y += 10;
    }

    // Bonuses section (if shift is active or about to be)
    if (shiftInfo.bonuses && shiftInfo.bonuses.length > 0) {
        ctx.fillStyle = '#9b59b6';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('ACTIVE BONUSES (During Shift)', contentX, y);
        y += 25;

        for (const bonus of shiftInfo.bonuses) {
            ctx.fillStyle = '#2ecc71';
            ctx.font = '16px monospace';
            ctx.fillText(`${bonus.icon} ${bonus.name}`, contentX + 10, y);
            y += 20;
            ctx.fillStyle = '#888';
            ctx.font = '14px monospace';
            ctx.fillText(`   ${bonus.description}`, contentX + 10, y);
            y += 25;
        }
    }

    // Win condition
    if (shiftInfo.winCondition) {
        ctx.fillStyle = '#3498db';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${shiftInfo.winCondition.icon} OBJECTIVE: ${shiftInfo.winCondition.title}`, contentX, y);
        y += 22;
        ctx.fillStyle = '#888';
        ctx.font = '14px monospace';
        y = drawWrappedText(ctx, shiftInfo.winCondition.description, contentX + 10, y, contentWidth - 20, 18);
    }

    // Instructions at bottom
    ctx.fillStyle = '#666';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ESC] or [O] Close', panelX + panelWidth / 2, panelY + panelHeight - 25);
}

/**
 * Draw the countdown/status timer
 */
function drawShiftTimer(centerX, y) {
    const countdown = Math.max(0, game.shiftCountdown || 0);
    const minutes = Math.floor(countdown / 60);
    const seconds = Math.floor(countdown % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (game.shiftActive) {
        // Shift is active - show MELTDOWN status
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MELTDOWN IN PROGRESS', centerX, y);

        ctx.fillStyle = '#ff6b6b';
        ctx.font = '18px monospace';
        ctx.fillText('Reach the exit before the lava consumes you!', centerX, y + 28);
    } else {
        // Countdown mode
        let timerColor = '#ffffff';
        let statusText = 'Time Until Shift';

        if (countdown <= 60) {
            timerColor = '#e74c3c';
            statusText = 'IMMINENT!';
        } else if (countdown <= 180) {
            timerColor = '#f39c12';
            statusText = 'Warning: Shift Approaching';
        }

        ctx.fillStyle = '#888';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(statusText, centerX, y - 5);

        ctx.fillStyle = timerColor;
        ctx.font = 'bold 36px monospace';
        ctx.fillText(timeStr, centerX, y + 30);
    }
}

/**
 * Draw wrapped text and return the new Y position
 */
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, x, y);
            line = words[i] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
    return y + lineHeight;
}

/**
 * Placeholder if shift system not loaded
 */
function drawShiftOverlayPlaceholder() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);

    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SHIFT SYSTEM', canvas.width / 2 + TRACKER_WIDTH / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#888';
    ctx.font = '18px monospace';
    ctx.fillText('Loading shift data...', canvas.width / 2 + TRACKER_WIDTH / 2, canvas.height / 2 + 20);
}

// Export
window.drawShiftOverlay = drawShiftOverlay;

console.log('✅ Shift overlay loaded');
