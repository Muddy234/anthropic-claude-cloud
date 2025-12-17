// === RIGHT-CLICK SYSTEM ===
// Handles right-click context menu, inspect popup, and related interactions

window.contextMenu = {
    visible: false, x: 0, y: 0, target: null, targetType: null, options: [], hoveredOption: -1
};

// Flag to prevent click-to-move after context menu action
window.contextMenuJustClosed = false;

// Ensure inspectPopup exists
if (!window.inspectPopup) {
    window.inspectPopup = { visible: false, target: null, targetType: null, tab: 0 };
}

let rightClickSystemInitialized = false;

function initRightClickSystem() {
    if (rightClickSystemInitialized) return;

    const canvas = document.getElementById('gameCanvas') || document.getElementById('canvas') || document.querySelector('canvas');
    if (!canvas) { console.error('Canvas not found!'); return; }

    window.gameCanvas = canvas;
    canvas.addEventListener('contextmenu', handleRightClick);
    canvas.addEventListener('click', handleContextMenuClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleInspectPopupClick);
    document.addEventListener('keydown', handleEscapeKey);
    rightClickSystemInitialized = true;
}

function handleRightClick(e) {
    e.preventDefault();
    if (typeof game === 'undefined' || game.state !== 'playing') return;
    window.inspectPopup.visible = false;

    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const trackerWidth = (typeof TRACKER_WIDTH !== 'undefined') ? TRACKER_WIDTH :
                         (window.TRACKER_WIDTH || 400);
    const tileSize = (typeof TILE_SIZE !== 'undefined') ? TILE_SIZE :
                     (window.TILE_SIZE || 32);
    const zoomLevel = window.currentZoom || ZOOM_LEVEL || 2;

    const effectiveTileSize = tileSize * zoomLevel;

    const viewX = clickX - trackerWidth;
    const viewY = clickY;

    // Ignore clicks in tracker area
    if (viewX < 0) return;

    const camX = game.camera ? game.camera.x : 0;
    const camY = game.camera ? game.camera.y : 0;

    const gridX = Math.floor(viewX / effectiveTileSize + camX);
    const gridY = Math.floor(viewY / effectiveTileSize + camY);

    // Check for enemy - open inspect popup
    if (game.enemies) {
        const clickedEnemy = game.enemies.find(e =>
            Math.floor(e.gridX) === gridX && Math.floor(e.gridY) === gridY
        );

        if (clickedEnemy) {
            const tile = game.map?.[gridY]?.[gridX];
            if (tile && tile.visible) {
                window.inspectPopup.visible = true;
                window.inspectPopup.target = clickedEnemy;
                window.inspectPopup.targetType = 'enemy';
                window.inspectPopup.tab = 0;
                return;
            }
        }
    }

    // Check for merchant
    if (game.merchant) {
        const dx = Math.abs(gridX - game.merchant.gridX);
        const dy = Math.abs(gridY - game.merchant.gridY);
        if (dx <= 1 && dy <= 1) {
            game.state = 'merchant';
            game.merchantMsg = "";
            return;
        }
    }

    // Check for loot - pick up directly
    if (game.groundLoot) {
        const clickedLoot = game.groundLoot.find(pile =>
            Math.floor(pile.x) === gridX && Math.floor(pile.y) === gridY
        );

        if (clickedLoot) {
            const tile = game.map?.[gridY]?.[gridX];
            if (tile && tile.visible) {
                if (typeof window.pickupLootPile === 'function') {
                    window.pickupLootPile(clickedLoot);
                }
                return;
            }
        }
    }

    // Check for interactable decorations (shrines, chests, altars)
    if (game.decorations) {
        const clickedDecoration = game.decorations.find(dec =>
            Math.floor(dec.x) === gridX && Math.floor(dec.y) === gridY && dec.interactable
        );

        if (clickedDecoration) {
            const tile = game.map?.[gridY]?.[gridX];
            if (tile && tile.visible) {
                const dx = Math.abs(gridX - game.player.gridX);
                const dy = Math.abs(gridY - game.player.gridY);
                if (dx <= 2 && dy <= 2) {
                    if (typeof window.interactWithDecoration === 'function') {
                        window.interactWithDecoration(clickedDecoration, game.player);
                    }
                    return;
                } else {
                    if (typeof addMessage === 'function') {
                        addMessage('Move closer to interact.');
                    }
                    return;
                }
            }
        }
    }

    // Empty tile - no action (walk disabled with mouse combat)
}

function handleMouseMove(e) {
    if (!window.contextMenu.visible) return;
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const menuWidth = 120, optionHeight = 25;
    if (mouseX >= window.contextMenu.x && mouseX <= window.contextMenu.x + menuWidth &&
        mouseY >= window.contextMenu.y && mouseY <= window.contextMenu.y + (window.contextMenu.options.length * optionHeight)) {
        window.contextMenu.hoveredOption = Math.floor((mouseY - window.contextMenu.y) / optionHeight);
    } else {
        window.contextMenu.hoveredOption = -1;
    }
}

function handleContextMenuClick(e) {
    if (!window.contextMenu.visible) return;

    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const menuWidth = 120;
    const optionHeight = 25;
    const menuX = window.contextMenu.x;
    const menuY = window.contextMenu.y;
    const menuHeight = window.contextMenu.options.length * optionHeight;

    const withinX = clickX >= menuX && clickX <= menuX + menuWidth;
    const withinY = clickY >= menuY && clickY <= menuY + menuHeight;

    if (withinX && withinY) {
        const optionIndex = Math.floor((clickY - menuY) / optionHeight);

        if (optionIndex >= 0 && optionIndex < window.contextMenu.options.length) {
            const option = window.contextMenu.options[optionIndex];
            executeContextAction(option.action, window.contextMenu.target, window.contextMenu.targetType);
        }
    }

    // Close menu and set flag to prevent click-to-move
    window.contextMenu.visible = false;
    window.contextMenu.hoveredOption = -1;
    window.contextMenuJustClosed = true;

    // Reset flag after a short delay
    setTimeout(() => { window.contextMenuJustClosed = false; }, 50);
}

function executeContextAction(action, target, targetType) {
    switch (action) {
        case 'attack':
            if (typeof engageCombat === 'function' && targetType === 'enemy') {
                engageCombat(game.player, target);
            }
            break;

        case 'pickup':
            if (typeof window.pickupLootPile === 'function' && targetType === 'loot') {
                window.pickupLootPile(target);
            }
            break;

        case 'inspect':
            window.inspectPopup.visible = true;
            window.inspectPopup.target = target;
            window.inspectPopup.targetType = targetType;
            break;

        case 'talk':
            if (targetType === 'npc' && target === game.merchant) {
                game.state = 'merchant';
                game.merchantMsg = "";
            }
            break;

        case 'walk':
        case 'cancel':
            // No action needed
            break;
    }
}

function handleInspectPopupClick(e) {
    if (!window.inspectPopup.visible) return;

    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Popup dimensions: 300x400, bottom-right position
    const popupWidth = 300;
    const popupHeight = 400;
    const margin = 20;
    const popupX = canvas.width - popupWidth - margin;
    const popupY = canvas.height - popupHeight - margin;

    // Check if click is inside popup
    if (mouseX >= popupX && mouseX <= popupX + popupWidth &&
        mouseY >= popupY && mouseY <= popupY + popupHeight) {

        // Check for tab clicks
        const tabY = popupY + 40;
        const tabHeight = 22;
        const tabWidth = popupWidth / 4;

        if (mouseY >= tabY && mouseY <= tabY + tabHeight) {
            const tabIndex = Math.floor((mouseX - popupX) / tabWidth);
            if (tabIndex >= 0 && tabIndex <= 3) {
                window.inspectPopup.tab = tabIndex;
            }
        }
        return;
    }

    // Click outside popup - don't close (only ESC closes it)
}

function handleEscapeKey(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
        if (window.inspectPopup.visible) {
            window.inspectPopup.visible = false;
        } else if (window.contextMenu.visible) {
            window.contextMenu.visible = false;
            window.contextMenu.hoveredOption = -1;
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRightClickSystem);
} else {
    initRightClickSystem();
}

// Right-click system loaded