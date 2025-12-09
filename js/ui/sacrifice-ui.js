// ============================================================================
// SACRIFICE UI SYSTEM
// ============================================================================
// Handles altar sacrifice - select items from inventory to sacrifice for HP
// ============================================================================

// ============================================================================
// STATE
// ============================================================================

const SacrificeUI = {
    isOpen: false,
    selectedItems: [],  // Indices of selected items in inventory
    currentAltar: null,
    scrollOffset: 0,
    maxVisibleItems: 8
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Open the sacrifice UI
 * @param {object} altar - The altar decoration being used
 * @param {object} player - The player
 * @returns {boolean} - True if UI opened successfully
 */
function openSacrificeUI(altar, player) {
    if (!player || !player.inventory) return false;

    // Check if player has items to sacrifice
    if (player.inventory.length === 0) {
        if (typeof addMessage === 'function') {
            addMessage('You have nothing to sacrifice.');
        }
        return false;
    }

    SacrificeUI.isOpen = true;
    SacrificeUI.selectedItems = [];
    SacrificeUI.currentAltar = altar;
    SacrificeUI.scrollOffset = 0;

    // Pause game while UI is open
    game.state = 'sacrifice';

    if (typeof addMessage === 'function') {
        addMessage('Select items to sacrifice to the altar...');
    }

    return true;
}

/**
 * Close the sacrifice UI
 */
function closeSacrificeUI() {
    SacrificeUI.isOpen = false;
    SacrificeUI.selectedItems = [];
    SacrificeUI.currentAltar = null;
    SacrificeUI.scrollOffset = 0;

    // Resume game
    game.state = 'playing';
}

/**
 * Toggle selection of an item
 * @param {number} index - Index in player inventory
 */
function toggleItemSelection(index) {
    const idx = SacrificeUI.selectedItems.indexOf(index);
    if (idx > -1) {
        SacrificeUI.selectedItems.splice(idx, 1);
    } else {
        SacrificeUI.selectedItems.push(index);
    }
}

/**
 * Calculate total favor (HP) from selected items
 * @returns {number} - Total HP that would be restored
 */
function calculateTotalFavor() {
    let total = 0;

    for (const idx of SacrificeUI.selectedItems) {
        const item = game.player.inventory[idx];
        if (item) {
            // Get favor value (use existing or calculate from rarity)
            const favor = item.favorValue || (typeof getFavorValue === 'function' ? getFavorValue(item) : 5);
            total += favor * (item.count || 1);
        }
    }

    return total;
}

/**
 * Confirm the sacrifice - remove items and restore HP
 */
function confirmSacrifice() {
    if (SacrificeUI.selectedItems.length === 0) {
        if (typeof addMessage === 'function') {
            addMessage('Select items to sacrifice first.');
        }
        return;
    }

    const totalFavor = calculateTotalFavor();
    const player = game.player;

    // Calculate actual HP restored (capped at max)
    const hpBefore = player.hp;
    const hpRestored = Math.min(totalFavor, player.maxHp - player.hp);
    player.hp = Math.min(player.maxHp, player.hp + totalFavor);

    // Remove items from inventory (sort indices descending to remove from end first)
    const sortedIndices = [...SacrificeUI.selectedItems].sort((a, b) => b - a);
    for (const idx of sortedIndices) {
        game.player.inventory.splice(idx, 1);
    }

    // Show message
    if (typeof addMessage === 'function') {
        const itemCount = SacrificeUI.selectedItems.length;
        const itemText = itemCount === 1 ? 'item' : 'items';
        if (hpRestored > 0) {
            addMessage(`You sacrifice ${itemCount} ${itemText} and restore ${hpRestored} HP!`);
        } else {
            addMessage(`You sacrifice ${itemCount} ${itemText}. (HP already full)`);
        }
    }

    // Visual/audio feedback
    if (typeof createFloatingText === 'function' && hpRestored > 0) {
        createFloatingText(player.gridX, player.gridY, `+${hpRestored} HP`, '#2ecc71');
    }

    // Close the UI
    closeSacrificeUI();
}

/**
 * Handle scroll in the sacrifice UI
 * @param {number} delta - Scroll delta (positive = down)
 */
function scrollSacrificeUI(delta) {
    const maxScroll = Math.max(0, game.player.inventory.length - SacrificeUI.maxVisibleItems);
    SacrificeUI.scrollOffset = Math.max(0, Math.min(maxScroll, SacrificeUI.scrollOffset + delta));
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Render the sacrifice UI overlay
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function renderSacrificeUI(ctx) {
    if (!SacrificeUI.isOpen) return;

    const canvas = ctx.canvas;
    const player = game.player;

    // Darken background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Panel dimensions
    const panelWidth = 500;
    const panelHeight = 450;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;

    // Draw panel background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Panel border
    ctx.strokeStyle = '#9b59b6';
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Header
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(panelX, panelY, panelWidth, 50);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SACRIFICE TO THE ALTAR', panelX + panelWidth / 2, panelY + 32);

    // HP Status
    const hpY = panelY + 70;
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(`HP: ${player.hp}/${player.maxHp}`, panelX + 20, hpY);

    // Selected favor total
    const totalFavor = calculateTotalFavor();
    const potentialHP = Math.min(totalFavor, player.maxHp - player.hp);
    ctx.fillStyle = '#2ecc71';
    ctx.textAlign = 'right';
    ctx.fillText(`Will Restore: +${potentialHP} HP`, panelX + panelWidth - 20, hpY);

    // Item list header
    const listY = hpY + 30;
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SELECT ITEMS TO SACRIFICE', panelX + 20, listY);
    ctx.textAlign = 'right';
    ctx.fillText('FAVOR', panelX + panelWidth - 20, listY);

    // Item list
    const itemStartY = listY + 15;
    const itemHeight = 36;
    const visibleItems = Math.min(SacrificeUI.maxVisibleItems, player.inventory.length);

    ctx.save();
    ctx.beginPath();
    ctx.rect(panelX + 10, itemStartY, panelWidth - 20, visibleItems * itemHeight);
    ctx.clip();

    for (let i = 0; i < visibleItems; i++) {
        const itemIdx = i + SacrificeUI.scrollOffset;
        if (itemIdx >= player.inventory.length) break;

        const item = player.inventory[itemIdx];
        const isSelected = SacrificeUI.selectedItems.includes(itemIdx);
        const itemY = itemStartY + i * itemHeight;

        // Selection highlight
        if (isSelected) {
            ctx.fillStyle = 'rgba(155, 89, 182, 0.3)';
            ctx.fillRect(panelX + 15, itemY, panelWidth - 30, itemHeight - 4);
        }

        // Hover hint
        ctx.strokeStyle = isSelected ? '#9b59b6' : '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX + 15, itemY, panelWidth - 30, itemHeight - 4);

        // Checkbox
        ctx.fillStyle = isSelected ? '#9b59b6' : '#333';
        ctx.fillRect(panelX + 25, itemY + 8, 20, 20);
        ctx.strokeStyle = '#666';
        ctx.strokeRect(panelX + 25, itemY + 8, 20, 20);
        if (isSelected) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('✓', panelX + 35, itemY + 24);
        }

        // Item name with rarity color
        const rarityColors = {
            common: '#aaa',
            uncommon: '#2ecc71',
            rare: '#3498db',
            epic: '#9b59b6'
        };
        ctx.fillStyle = rarityColors[item.rarity] || '#aaa';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        const countText = item.count > 1 ? ` x${item.count}` : '';
        ctx.fillText(item.name + countText, panelX + 55, itemY + 22);

        // Favor value
        const favor = item.favorValue || (typeof getFavorValue === 'function' ? getFavorValue(item) : 5);
        const totalItemFavor = favor * (item.count || 1);
        ctx.fillStyle = '#e74c3c';
        ctx.textAlign = 'right';
        ctx.fillText(`+${totalItemFavor} HP`, panelX + panelWidth - 25, itemY + 22);
    }

    ctx.restore();

    // Scroll indicators
    if (player.inventory.length > SacrificeUI.maxVisibleItems) {
        ctx.fillStyle = '#666';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';

        if (SacrificeUI.scrollOffset > 0) {
            ctx.fillText('▲ Scroll Up', panelX + panelWidth / 2, itemStartY - 5);
        }

        const maxScroll = player.inventory.length - SacrificeUI.maxVisibleItems;
        if (SacrificeUI.scrollOffset < maxScroll) {
            ctx.fillText('▼ Scroll Down', panelX + panelWidth / 2, itemStartY + visibleItems * itemHeight + 15);
        }
    }

    // Buttons
    const buttonY = panelY + panelHeight - 60;
    const buttonWidth = 140;
    const buttonHeight = 40;

    // Sacrifice button
    const sacrificeX = panelX + panelWidth / 2 - buttonWidth - 20;
    const canSacrifice = SacrificeUI.selectedItems.length > 0;
    ctx.fillStyle = canSacrifice ? '#9b59b6' : '#444';
    ctx.fillRect(sacrificeX, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = canSacrifice ? '#fff' : '#888';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SACRIFICE', sacrificeX + buttonWidth / 2, buttonY + 26);

    // Cancel button
    const cancelX = panelX + panelWidth / 2 + 20;
    ctx.fillStyle = '#444';
    ctx.fillRect(cancelX, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = '#fff';
    ctx.fillText('CANCEL', cancelX + buttonWidth / 2, buttonY + 26);

    // Instructions
    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click items to select/deselect. Press ESC to cancel.', panelX + panelWidth / 2, panelY + panelHeight - 15);

    // Store button bounds for click detection
    SacrificeUI._buttonBounds = {
        sacrifice: { x: sacrificeX, y: buttonY, w: buttonWidth, h: buttonHeight },
        cancel: { x: cancelX, y: buttonY, w: buttonWidth, h: buttonHeight },
        itemList: { x: panelX + 15, y: itemStartY, w: panelWidth - 30, h: visibleItems * itemHeight },
        itemHeight: itemHeight
    };
}

/**
 * Handle click in sacrifice UI
 * @param {number} x - Click X position
 * @param {number} y - Click Y position
 * @returns {boolean} - True if click was handled
 */
function handleSacrificeClick(x, y) {
    if (!SacrificeUI.isOpen || !SacrificeUI._buttonBounds) return false;

    const bounds = SacrificeUI._buttonBounds;

    // Check sacrifice button
    if (x >= bounds.sacrifice.x && x <= bounds.sacrifice.x + bounds.sacrifice.w &&
        y >= bounds.sacrifice.y && y <= bounds.sacrifice.y + bounds.sacrifice.h) {
        confirmSacrifice();
        return true;
    }

    // Check cancel button
    if (x >= bounds.cancel.x && x <= bounds.cancel.x + bounds.cancel.w &&
        y >= bounds.cancel.y && y <= bounds.cancel.y + bounds.cancel.h) {
        closeSacrificeUI();
        return true;
    }

    // Check item list
    if (x >= bounds.itemList.x && x <= bounds.itemList.x + bounds.itemList.w &&
        y >= bounds.itemList.y && y <= bounds.itemList.y + bounds.itemList.h) {
        const itemIndex = Math.floor((y - bounds.itemList.y) / bounds.itemHeight) + SacrificeUI.scrollOffset;
        if (itemIndex < game.player.inventory.length) {
            toggleItemSelection(itemIndex);
        }
        return true;
    }

    return true; // Consume click even if nothing was hit
}

/**
 * Handle keypress in sacrifice UI
 * @param {string} key - Key that was pressed
 * @returns {boolean} - True if key was handled
 */
function handleSacrificeKey(key) {
    if (!SacrificeUI.isOpen) return false;

    if (key === 'Escape') {
        closeSacrificeUI();
        return true;
    }

    if (key === 'Enter') {
        confirmSacrifice();
        return true;
    }

    return false;
}

// ============================================================================
// EXPORTS
// ============================================================================

window.SacrificeUI = SacrificeUI;
window.openSacrificeUI = openSacrificeUI;
window.closeSacrificeUI = closeSacrificeUI;
window.toggleItemSelection = toggleItemSelection;
window.calculateTotalFavor = calculateTotalFavor;
window.confirmSacrifice = confirmSacrifice;
window.scrollSacrificeUI = scrollSacrificeUI;
window.renderSacrificeUI = renderSacrificeUI;
window.handleSacrificeClick = handleSacrificeClick;
window.handleSacrificeKey = handleSacrificeKey;

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Add wheel scroll listener for sacrifice UI
function initSacrificeUIEvents() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        setTimeout(initSacrificeUIEvents, 100);
        return;
    }

    canvas.addEventListener('wheel', (e) => {
        if (game.state !== 'sacrifice' || !SacrificeUI.isOpen) return;

        e.preventDefault();
        const delta = e.deltaY > 0 ? 1 : -1;
        scrollSacrificeUI(delta);
    }, { passive: false });
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSacrificeUIEvents);
} else {
    initSacrificeUIEvents();
}

console.log('✅ Sacrifice UI system loaded');
