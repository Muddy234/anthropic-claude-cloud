// ============================================================================
// SETTINGS OVERLAY - Game settings and options
// ============================================================================
// Placeholder for future implementation
// ============================================================================

/**
 * Draw the settings overlay
 */
function drawSettingsOverlay() {
    // Background overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);

    // Panel dimensions
    const panelWidth = Math.min(600, canvas.width - TRACKER_WIDTH - 100);
    const panelHeight = Math.min(500, canvas.height - 80);
    const panelX = TRACKER_WIDTH + (canvas.width - TRACKER_WIDTH - panelWidth) / 2;
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
    ctx.fillText('SETTINGS', panelX + panelWidth / 2, panelY + 60);

    // Placeholder content
    ctx.fillStyle = '#888';
    ctx.font = '20px monospace';
    ctx.fillText('Settings menu coming soon...', panelX + panelWidth / 2, panelY + panelHeight / 2 - 40);

    ctx.font = '16px monospace';
    ctx.fillText('Future options:', panelX + panelWidth / 2, panelY + panelHeight / 2);

    ctx.fillStyle = '#666';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    const listX = panelX + 150;
    let listY = panelY + panelHeight / 2 + 30;

    const options = [
        '• Audio volume',
        '• Graphics quality',
        '• Key bindings',
        '• UI scale',
        '• Game difficulty'
    ];

    for (const option of options) {
        ctx.fillText(option, listX, listY);
        listY += 25;
    }

    // Instructions
    ctx.textAlign = 'center';
    ctx.fillText('[ESC] or [O] Close', panelX + panelWidth / 2, panelY + panelHeight - 30);
}

// Export
window.drawSettingsOverlay = drawSettingsOverlay;

console.log('✅ Settings overlay loaded (placeholder)');
