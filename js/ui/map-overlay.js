// ============================================================================
// MAP OVERLAY - Full dungeon map view
// ============================================================================
// Placeholder for future implementation
// ============================================================================

/**
 * Draw the map overlay
 */
function drawMapOverlay() {
    // Background overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);

    // Panel dimensions
    const panelWidth = Math.min(800, canvas.width - TRACKER_WIDTH - 100);
    const panelHeight = Math.min(600, canvas.height - 80);
    const panelX = TRACKER_WIDTH + (canvas.width - TRACKER_WIDTH - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;

    // Panel background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Panel border
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 4;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Title
    ctx.fillStyle = '#3498db';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DUNGEON MAP', panelX + panelWidth / 2, panelY + 60);

    // Placeholder content
    ctx.fillStyle = '#888';
    ctx.font = '20px monospace';
    ctx.fillText('Full dungeon map coming soon...', panelX + panelWidth / 2, panelY + panelHeight / 2 - 20);

    ctx.font = '16px monospace';
    ctx.fillText('Use the mini-map in the top-right corner for now', panelX + panelWidth / 2, panelY + panelHeight / 2 + 20);

    // Instructions
    ctx.fillStyle = '#666';
    ctx.font = '14px monospace';
    ctx.fillText('[ESC] or [M] Close', panelX + panelWidth / 2, panelY + panelHeight - 30);
}

// Export
window.drawMapOverlay = drawMapOverlay;

console.log('✅ Map overlay loaded (placeholder)');
