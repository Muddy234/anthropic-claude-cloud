// ============================================================================
// CHEST UI SYSTEM
// ============================================================================
// Handles chest opening - displays chest contents and allows taking items
// ============================================================================

// ============================================================================
// STATE
// ============================================================================

const ChestUI = {
    isOpen: false,
    currentChest: null,
    contents: [],      // Array of items in the chest
    scrollOffset: 0,
    maxVisibleItems: 6
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Open the chest UI with specific contents
 * @param {object} chest - The chest decoration being opened
 * @param {array} contents - Array of items in the chest
 * @returns {boolean} - True if UI opened successfully
 */
function openChestUI(chest, contents) {
    if (!contents || contents.length === 0) {
        if (typeof addMessage === 'function') {
            addMessage('The chest is empty.');
        }
        return false;
    }

    ChestUI.isOpen = true;
    ChestUI.currentChest = chest;
    ChestUI.contents = contents.map(item => ({ ...item, taken: false }));
    ChestUI.scrollOffset = 0;

    // Pause game while UI is open
    game.state = 'chest';

    if (typeof addMessage === 'function') {
        addMessage('You open the chest...');
    }

    return true;
}

/**
 * Close the chest UI
 */
function closeChestUI() {
    ChestUI.isOpen = false;
    ChestUI.currentChest = null;
    ChestUI.contents = [];
    ChestUI.scrollOffset = 0;

    // Resume game
    game.state = 'playing';
}

/**
 * Take a specific item from the chest
 * @param {number} index - Index in chest contents
 */
function takeChestItem(index) {
    if (index < 0 || index >= ChestUI.contents.length) return;

    const item = ChestUI.contents[index];
    if (item.taken) return;

    // Add to player inventory
    addItemToInventory(item);

    // Mark as taken
    item.taken = true;

    // Show message
    if (typeof addMessage === 'function') {
        const countText = item.count > 1 ? ` x${item.count}` : '';
        addMessage(`Took: ${item.name}${countText}`);
    }

    // Check if all items taken
    const allTaken = ChestUI.contents.every(i => i.taken);
    if (allTaken) {
        // Mark chest as opened and close UI
        if (ChestUI.currentChest) {
            ChestUI.currentChest.interactable = false;
            ChestUI.currentChest.type = ChestUI.currentChest.type.replace('chest', 'chest_open');
            if (ChestUI.currentChest.data) {
                ChestUI.currentChest.data.symbol = '📭';
                ChestUI.currentChest.data.glow = false;
            }
        }
        closeChestUI();
    }
}

/**
 * Take all items from the chest
 */
function takeAllChestItems() {
    for (let i = 0; i < ChestUI.contents.length; i++) {
        if (!ChestUI.contents[i].taken) {
            takeChestItem(i);
        }
    }
}

/**
 * Add item to player inventory
 * @param {object} item - Item to add
 */
function addItemToInventory(item) {
    if (!game.player) return;
    if (!game.player.inventory) game.player.inventory = [];

    // Check if stackable and already in inventory
    if (item.stackable || item.type === 'consumable') {
        const existing = game.player.inventory.find(i => i.id === item.id || i.name === item.name);
        if (existing) {
            existing.count = (existing.count || 1) + (item.count || 1);
            return;
        }
    }

    // Add new item
    game.player.inventory.push({
        ...item,
        count: item.count || 1,
        taken: undefined  // Remove the taken flag
    });
}

/**
 * Handle scroll in the chest UI
 * @param {number} delta - Scroll delta (positive = down)
 */
function scrollChestUI(delta) {
    const maxScroll = Math.max(0, ChestUI.contents.length - ChestUI.maxVisibleItems);
    ChestUI.scrollOffset = Math.max(0, Math.min(maxScroll, ChestUI.scrollOffset + delta));
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Render the chest UI overlay
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function renderChestUI(ctx) {
    if (!ChestUI.isOpen) return;

    const canvas = ctx.canvas;

    // Darken background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Panel dimensions
    const panelWidth = 450;
    const panelHeight = 380;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;

    // Draw panel background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Panel border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Header
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(panelX, panelY, panelWidth, 50);
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHEST CONTENTS', panelX + panelWidth / 2, panelY + 32);

    // Chest icon
    ctx.font = '24px monospace';
    ctx.fillText('📦', panelX + 30, panelY + 34);
    ctx.fillText('📦', panelX + panelWidth - 30, panelY + 34);

    // Item list header
    const listY = panelY + 70;
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ITEMS', panelX + 20, listY);
    ctx.textAlign = 'right';
    ctx.fillText('CLICK TO TAKE', panelX + panelWidth - 20, listY);

    // Item list
    const itemStartY = listY + 15;
    const itemHeight = 42;
    const visibleItems = Math.min(ChestUI.maxVisibleItems, ChestUI.contents.length);

    ctx.save();
    ctx.beginPath();
    ctx.rect(panelX + 10, itemStartY, panelWidth - 20, visibleItems * itemHeight);
    ctx.clip();

    for (let i = 0; i < visibleItems; i++) {
        const itemIdx = i + ChestUI.scrollOffset;
        if (itemIdx >= ChestUI.contents.length) break;

        const item = ChestUI.contents[itemIdx];
        const isTaken = item.taken;
        const itemY = itemStartY + i * itemHeight;

        // Item background
        if (isTaken) {
            ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
        } else {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
        }
        ctx.fillRect(panelX + 15, itemY, panelWidth - 30, itemHeight - 4);

        // Item border
        ctx.strokeStyle = isTaken ? '#333' : '#FFD700';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX + 15, itemY, panelWidth - 30, itemHeight - 4);

        // Item icon (based on type)
        const icon = getItemIcon(item);
        ctx.font = '20px monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = isTaken ? '#555' : '#fff';
        ctx.fillText(icon, panelX + 25, itemY + 26);

        // Item name with rarity color
        const rarityColors = {
            common: '#aaa',
            uncommon: '#2ecc71',
            rare: '#3498db',
            epic: '#9b59b6',
            legendary: '#FFD700'
        };
        ctx.fillStyle = isTaken ? '#555' : (rarityColors[item.rarity] || '#aaa');
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        const countText = item.count > 1 ? ` x${item.count}` : '';
        ctx.fillText(item.name + countText, panelX + 55, itemY + 22);

        // Item type/description
        ctx.fillStyle = isTaken ? '#444' : '#888';
        ctx.font = '11px monospace';
        const typeText = item.weaponType || item.type || item.slot || '';
        ctx.fillText(typeText, panelX + 55, itemY + 36);

        // Take button or "Taken" label
        ctx.textAlign = 'right';
        if (isTaken) {
            ctx.fillStyle = '#555';
            ctx.font = '12px monospace';
            ctx.fillText('TAKEN', panelX + panelWidth - 25, itemY + 26);
        } else {
            // Draw take button
            const btnX = panelX + panelWidth - 85;
            const btnY = itemY + 8;
            const btnW = 55;
            const btnH = 26;

            ctx.fillStyle = '#FFD700';
            ctx.fillRect(btnX, btnY, btnW, btnH);
            ctx.fillStyle = '#1a1a2e';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('TAKE', btnX + btnW / 2, btnY + 18);
        }
    }

    ctx.restore();

    // Scroll indicators
    if (ChestUI.contents.length > ChestUI.maxVisibleItems) {
        ctx.fillStyle = '#666';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';

        if (ChestUI.scrollOffset > 0) {
            ctx.fillText('▲ Scroll Up', panelX + panelWidth / 2, itemStartY - 5);
        }

        const maxScroll = ChestUI.contents.length - ChestUI.maxVisibleItems;
        if (ChestUI.scrollOffset < maxScroll) {
            ctx.fillText('▼ Scroll Down', panelX + panelWidth / 2, itemStartY + visibleItems * itemHeight + 15);
        }
    }

    // Buttons
    const buttonY = panelY + panelHeight - 60;
    const buttonWidth = 140;
    const buttonHeight = 40;

    // Take All button
    const remainingItems = ChestUI.contents.filter(i => !i.taken).length;
    const takeAllX = panelX + panelWidth / 2 - buttonWidth - 20;
    const canTakeAll = remainingItems > 0;
    ctx.fillStyle = canTakeAll ? '#2ecc71' : '#444';
    ctx.fillRect(takeAllX, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = canTakeAll ? '#fff' : '#888';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TAKE ALL', takeAllX + buttonWidth / 2, buttonY + 26);

    // Close button
    const closeX = panelX + panelWidth / 2 + 20;
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(closeX, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = '#fff';
    ctx.fillText('CLOSE', closeX + buttonWidth / 2, buttonY + 26);

    // Instructions
    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click TAKE to collect items. Press ESC to close.', panelX + panelWidth / 2, panelY + panelHeight - 15);

    // Store button bounds for click detection
    ChestUI._buttonBounds = {
        takeAll: { x: takeAllX, y: buttonY, w: buttonWidth, h: buttonHeight },
        close: { x: closeX, y: buttonY, w: buttonWidth, h: buttonHeight },
        itemList: { x: panelX + 15, y: itemStartY, w: panelWidth - 30, h: visibleItems * itemHeight },
        itemHeight: itemHeight,
        panelX: panelX,
        panelWidth: panelWidth
    };
}

/**
 * Get icon for item based on type
 * @param {object} item - Item to get icon for
 * @returns {string} - Emoji icon
 */
function getItemIcon(item) {
    // Check for specific item types
    if (item.id === 'torch' || item.name?.toLowerCase().includes('torch')) return '🔥';
    if (item.type === 'consumable' || item.name?.toLowerCase().includes('potion')) return '🧪';

    // Weapon types
    if (item.weaponType === 'sword') return '🗡️';
    if (item.weaponType === 'mace') return '🔨';
    if (item.weaponType === 'bow') return '🏹';
    if (item.weaponType === 'crossbow') return '🎯';
    if (item.weaponType === 'staff') return '🪄';
    if (item.weaponType === 'polearm') return '🔱';
    if (item.weaponType === 'knife') return '🔪';

    // Armor slots
    if (item.slot === 'HEAD') return '🪖';
    if (item.slot === 'CHEST') return '🛡️';
    if (item.slot === 'LEGS') return '👖';
    if (item.slot === 'FEET') return '👢';

    return '📦';
}

/**
 * Handle click in chest UI
 * @param {number} x - Click X position
 * @param {number} y - Click Y position
 * @returns {boolean} - True if click was handled
 */
function handleChestClick(x, y) {
    if (!ChestUI.isOpen || !ChestUI._buttonBounds) return false;

    const bounds = ChestUI._buttonBounds;

    // Check Take All button
    if (x >= bounds.takeAll.x && x <= bounds.takeAll.x + bounds.takeAll.w &&
        y >= bounds.takeAll.y && y <= bounds.takeAll.y + bounds.takeAll.h) {
        takeAllChestItems();
        return true;
    }

    // Check Close button
    if (x >= bounds.close.x && x <= bounds.close.x + bounds.close.w &&
        y >= bounds.close.y && y <= bounds.close.y + bounds.close.h) {
        // Mark chest as opened before closing
        if (ChestUI.currentChest) {
            ChestUI.currentChest.interactable = false;
            ChestUI.currentChest.type = ChestUI.currentChest.type.replace('chest', 'chest_open');
            if (ChestUI.currentChest.data) {
                ChestUI.currentChest.data.symbol = '📭';
                ChestUI.currentChest.data.glow = false;
            }
        }
        closeChestUI();
        return true;
    }

    // Check item list clicks (for TAKE buttons)
    if (x >= bounds.itemList.x && x <= bounds.itemList.x + bounds.itemList.w &&
        y >= bounds.itemList.y && y <= bounds.itemList.y + bounds.itemList.h) {
        const itemIndex = Math.floor((y - bounds.itemList.y) / bounds.itemHeight) + ChestUI.scrollOffset;
        if (itemIndex < ChestUI.contents.length && !ChestUI.contents[itemIndex].taken) {
            // Check if click is on the TAKE button (right side of item row)
            const takeButtonX = bounds.panelX + bounds.panelWidth - 85;
            if (x >= takeButtonX) {
                takeChestItem(itemIndex);
            }
        }
        return true;
    }

    return true; // Consume click even if nothing was hit
}

/**
 * Handle keypress in chest UI
 * @param {string} key - Key that was pressed
 * @returns {boolean} - True if key was handled
 */
function handleChestKey(key) {
    if (!ChestUI.isOpen) return false;

    if (key === 'Escape') {
        // Mark chest as opened before closing
        if (ChestUI.currentChest) {
            ChestUI.currentChest.interactable = false;
            ChestUI.currentChest.type = ChestUI.currentChest.type.replace('chest', 'chest_open');
            if (ChestUI.currentChest.data) {
                ChestUI.currentChest.data.symbol = '📭';
                ChestUI.currentChest.data.glow = false;
            }
        }
        closeChestUI();
        return true;
    }

    if (key === 'Enter' || key === ' ') {
        takeAllChestItems();
        return true;
    }

    return false;
}

// ============================================================================
// EXPORTS
// ============================================================================

window.ChestUI = ChestUI;
window.openChestUI = openChestUI;
window.closeChestUI = closeChestUI;
window.takeChestItem = takeChestItem;
window.takeAllChestItems = takeAllChestItems;
window.scrollChestUI = scrollChestUI;
window.renderChestUI = renderChestUI;
window.handleChestClick = handleChestClick;
window.handleChestKey = handleChestKey;

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Add wheel scroll listener for chest UI
function initChestUIEvents() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        setTimeout(initChestUIEvents, 100);
        return;
    }

    canvas.addEventListener('wheel', (e) => {
        if (game.state !== 'chest' || !ChestUI.isOpen) return;

        e.preventDefault();
        const delta = e.deltaY > 0 ? 1 : -1;
        scrollChestUI(delta);
    }, { passive: false });
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChestUIEvents);
} else {
    initChestUIEvents();
}

console.log('Chest UI system loaded');
