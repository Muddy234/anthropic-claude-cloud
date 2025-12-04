// === RIGHT-CLICK SYSTEM WITH CLICK DEBUG ===
// This file handles the logic of handling a Player Right-Click

window.contextMenu = {
    visible: false, x: 0, y: 0, target: null, targetType: null, options: [], hoveredOption: -1
};

// Flag to prevent click-to-move after context menu action
window.contextMenuJustClosed = false;

// inspectPopup is now defined in input-handler.js and exported to window
// We just ensure it exists with defaults if not yet loaded
if (!window.inspectPopup) {
    window.inspectPopup = { visible: false, target: null, targetType: null, tab: 0 };
}

let rightClickSystemInitialized = false;

function initRightClickSystem() {
    if (rightClickSystemInitialized) return;
    console.log('Initializing right-click system...');
    const canvas = document.getElementById('gameCanvas') || document.getElementById('canvas') || document.querySelector('canvas');
    if (!canvas) { console.error('Canvas not found!'); return; }
    window.gameCanvas = canvas;
    canvas.addEventListener('contextmenu', handleRightClick);
    canvas.addEventListener('click', handleContextMenuClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleInspectPopupClick);
    document.addEventListener('keydown', handleEscapeKey);
    rightClickSystemInitialized = true;
    console.log('✓ Right-click system initialized');
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
    const zoomLevel = (typeof ZOOM_LEVEL !== 'undefined') ? ZOOM_LEVEL : 
                      (window.ZOOM_LEVEL || 2);
    
    const effectiveTileSize = tileSize * zoomLevel;
    
    const viewX = clickX - trackerWidth;
    const viewY = clickY;
    
    if (viewX < 0) {
        console.log('Clicked in tracker area, ignoring');
        return;
    }
    
    const camX = game.camera ? game.camera.x : 0;
    const camY = game.camera ? game.camera.y : 0;
    
    const gridX = Math.floor(viewX / effectiveTileSize + camX);
    const gridY = Math.floor(viewY / effectiveTileSize + camY);
    
    console.log('=== GRID CALCULATION DEBUG ===');
    console.log('Click screen coords:', Math.round(clickX), Math.round(clickY));
    console.log('TRACKER_WIDTH used:', trackerWidth);
    console.log('View coords (after tracker):', Math.round(viewX), Math.round(viewY));
    console.log('Camera:', camX.toFixed(2), camY.toFixed(2));
    console.log('Tile size:', tileSize, '× zoom:', zoomLevel, '=', effectiveTileSize);
    console.log('Calculated grid:', gridX, gridY);
    console.log('Player actual grid:', game.player.gridX, game.player.gridY);
    console.log('===========================');
    
    let target = null;
    let targetType = null;
    let options = [];
    
    if (game.enemies) {
        const clickedEnemy = game.enemies.find(e =>
            Math.floor(e.gridX) === gridX && Math.floor(e.gridY) === gridY
        );

        // FOG OF WAR: Only allow interaction with visible enemies
        if (clickedEnemy) {
            const tile = game.map?.[gridY]?.[gridX];
            if (tile && tile.visible) {
                console.log('Clicked on enemy:', clickedEnemy.name);
                target = clickedEnemy;
                targetType = 'enemy';
                options = [
                    { text: 'Attack', action: 'attack' },
                    { text: 'Inspect', action: 'inspect' },
                    { text: 'Cancel', action: 'cancel' }
                ];
            } else {
                console.log('Enemy not visible - ignoring click');
            }
        }
    }
    
    if (!target && game.merchant) {
        const dx = Math.abs(gridX - game.merchant.gridX);
        const dy = Math.abs(gridY - game.merchant.gridY);
        if (dx <= 1 && dy <= 1) {
            console.log('Clicked on merchant');
            target = game.merchant;
            targetType = 'npc';
            options = [
                { text: 'Talk', action: 'talk' },
                { text: 'Inspect', action: 'inspect' },
                { text: 'Cancel', action: 'cancel' }
            ];
        }
    }

    // Check for loot
    if (!target && game.groundLoot) {
        const clickedLoot = game.groundLoot.find(pile =>
            Math.floor(pile.x) === gridX && Math.floor(pile.y) === gridY
        );

        if (clickedLoot) {
            const tile = game.map?.[gridY]?.[gridX];
            if (tile && tile.visible) {
                console.log('Clicked on loot pile');
                target = clickedLoot;
                targetType = 'loot';
                options = [
                    { text: 'Pick up', action: 'pickup' },
                    { text: 'Inspect', action: 'inspect' },
                    { text: 'Cancel', action: 'cancel' }
                ];
            }
        }
    }

    if (!target) {
        target = { x: gridX, y: gridY };
        targetType = 'tile';
        options = [
            { text: 'Walk here', action: 'walk' },
            { text: 'Cancel', action: 'cancel' }
        ];
    }
    
    // Store UNSCALED menu position for click detection
    // Menu is rendered at scaled position, clicks come in at raw position
    window.contextMenu.visible = true;
    window.contextMenu.x = clickX;  // Scaled position (internal canvas coords)
    window.contextMenu.y = clickY;
    window.contextMenu.target = target;
    window.contextMenu.targetType = targetType;
    window.contextMenu.options = options;
    window.contextMenu.hoveredOption = -1;
    
    // DEBUG: Store raw position for comparison
    window.contextMenu.rawX = e.clientX - rect.left;
    window.contextMenu.rawY = e.clientY - rect.top;
    window.contextMenu.scaleX = scaleX;
    window.contextMenu.scaleY = scaleY;
    
    console.log('Menu opened at scaled:', Math.round(clickX), Math.round(clickY));
    console.log('Menu raw position:', Math.round(window.contextMenu.rawX), Math.round(window.contextMenu.rawY));
    console.log('Scale factors:', scaleX.toFixed(2), scaleY.toFixed(2));
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
    // DEBUG: Log EVERY click
    console.log('%c=== CLICK DETECTED ===', 'color: yellow; font-weight: bold');
    console.log('Menu visible:', window.contextMenu.visible);
    
    if (!window.contextMenu.visible) {
        console.log('Menu not visible, ignoring click');
        return;
    }
    
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

    console.log('Click at (scaled):', Math.round(clickX), Math.round(clickY));
    console.log('Menu bounds: X[', Math.round(menuX), '-', Math.round(menuX + menuWidth), '] Y[', Math.round(menuY), '-', Math.round(menuY + menuHeight), ']');
    
    const withinX = clickX >= menuX && clickX <= menuX + menuWidth;
    const withinY = clickY >= menuY && clickY <= menuY + menuHeight;
    
    console.log('Within X bounds:', withinX);
    console.log('Within Y bounds:', withinY);

    if (withinX && withinY) {
        const optionIndex = Math.floor((clickY - menuY) / optionHeight);
        console.log('Option index:', optionIndex);
        
        if (optionIndex >= 0 && optionIndex < window.contextMenu.options.length) {
            const option = window.contextMenu.options[optionIndex];
            console.log('%c✓ SELECTED: ' + option.text + ' (action: ' + option.action + ')', 'color: lime; font-weight: bold');

            console.log('About to call executeContextAction...');
            console.log('Target:', window.contextMenu.target);
            console.log('TargetType:', window.contextMenu.targetType);

            // Execute action BEFORE closing menu
            try {
                executeContextAction(option.action, window.contextMenu.target, window.contextMenu.targetType);
            } catch (error) {
                console.error('ERROR calling executeContextAction:', error);
            }
        } else {
            console.log('Invalid option index');
        }
    } else {
        console.log('Click outside menu bounds');
    }
    
    // Close menu and set flag to prevent click-to-move
    window.contextMenu.visible = false;
    window.contextMenu.hoveredOption = -1;
    window.contextMenuJustClosed = true;

    // Reset flag after a short delay (prevents the same click from triggering walk)
    setTimeout(() => { window.contextMenuJustClosed = false; }, 50);
}

function executeContextAction(action, target, targetType) {
    console.log('%c=== EXECUTING ACTION ===', 'color: cyan; font-weight: bold');
    console.log('Action:', action);
    console.log('Target:', target);
    console.log('TargetType:', targetType);
    
    try {
        switch (action) {
            case 'attack':
                if (typeof engageCombat === 'function' && targetType === 'enemy') {
                    console.log('Engaging combat with', target.name);
                    engageCombat(game.player, target);
                }
                break;

            case 'pickup':
                console.log('Pickup action triggered, targetType:', targetType);
                console.log('pickupLootPile function exists:', typeof window.pickupLootPile);
                if (typeof window.pickupLootPile === 'function' && targetType === 'loot') {
                    console.log('Calling pickupLootPile with:', target);
                    window.pickupLootPile(target);
                } else {
                    console.error('Cannot pickup: function not available or wrong target type');
                }
                break;
            case 'inspect':
                console.log('Opening inspect popup');
                window.inspectPopup.visible = true;
                window.inspectPopup.target = target;
                window.inspectPopup.targetType = targetType;
                break;
            case 'talk':
                if (targetType === 'npc' && target === game.merchant) {
                    console.log('Opening merchant dialog');
                    game.state = 'merchant';
                    game.merchantMsg = "";
                }
                break;
            case 'walk':
                // Auto-walk disabled for player - manual movement only
                console.log('Click-to-move disabled. Use WASD/Arrow keys to move.');
                break;
            case 'cancel':
                console.log('Menu cancelled');
                break;
            default:
                console.log('Unknown action:', action);
        }
    } catch (error) {
        console.error('Error executing action:', error);
    }
    
    console.log('=== ACTION COMPLETE ===');
}

function handleInspectPopupClick(e) {
    if (!window.inspectPopup.visible) return;
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // New dimensions: 300x400, bottom-right position
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
                console.log('Switched to tab:', tabIndex);
            }
        }
        // Click inside popup, don't close
        return;
    }

    // Click outside popup - don't close (let player interact with game)
    // Only close with ESC key
}

function handleEscapeKey(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
        if (window.inspectPopup.visible) {
            console.log('ESC: Closing inspect popup');
            window.inspectPopup.visible = false;
        } else if (window.contextMenu.visible) {
            console.log('ESC: Closing context menu');
            window.contextMenu.visible = false;
            window.contextMenu.hoveredOption = -1;
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRightClickSystem);
} else {
    initRightClickSystem();
}

console.log('✓ Right-click system loaded (DEBUG VERSION)');