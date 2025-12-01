// === js/input/input-handler.js ===
// Enhanced with right-click context menu, inspect functionality, and skill action hotkeys
// UPDATED: Registers with SystemManager

// Track held keys for smooth movement
const keys = {};

// Context menu state
const contextMenu = {
    visible: false,
    x: 0,
    y: 0,
    target: null,  // What was right-clicked
    targetType: null,  // 'enemy', 'npc', 'item', 'tile'
    options: []
};

// Inspect popup state
const inspectPopup = {
    visible: false,
    target: null,
    targetType: null,
    tab: 0  // 0=STATS, 1=COMBAT, 2=BEHAVIOR, 3=LORE
};

// Key down - mark as held
window.addEventListener('keydown', e => {
    keys[e.key] = true;

    // Close inspect popup on ESC
    if (e.key === 'Escape' && inspectPopup.visible) {
        inspectPopup.visible = false;
        inspectPopup.target = null;
        inspectPopup.tab = 0;
        return;
    }

    // Tab switching for inspect popup (left/right arrows or Tab)
    if (inspectPopup.visible) {
        if (e.key === 'ArrowRight' || e.key === 'Tab') {
            e.preventDefault();
            inspectPopup.tab = (inspectPopup.tab + 1) % 4;
            return;
        }
        if (e.key === 'ArrowLeft') {
            inspectPopup.tab = (inspectPopup.tab + 3) % 4; // +3 is same as -1 mod 4
            return;
        }
    }

    // Close context menu on ESC
    if (e.key === 'Escape' && contextMenu.visible) {
        contextMenu.visible = false;
        contextMenu.target = null;
        return;
    }

    // Close skills menu on ESC or K
    if ((e.key === 'Escape' || e.key === 'k' || e.key === 'K') && game.state === 'skills') {
        game.state = 'playing';
        return;
    }

    // Start new game
    if (e.key === ' ') {
        if (game.state === 'menu') {
            startNewGame();
            return;
        } else if (game.state === 'gameover') {
            restartGame();
            return;
        }
    }

    // Trigger shift (debug)
    if (e.key === 'p' || e.key === 'P') {
        if (game.state === 'playing' && !game.shiftActive) {
            triggerShift('magma_collapse');
        }
    }

    // Level up screen
    if (game.state === 'levelup') {
        if (!game.levelUpData) return;
        if (game.levelUpData.attributePoints > 0) {
            if (e.key === '1') { game.levelUpData.tempStats.STR++; game.levelUpData.attributePoints--; }
            if (e.key === '2') { game.levelUpData.tempStats.AGI++; game.levelUpData.attributePoints--; }
            if (e.key === '3') { game.levelUpData.tempStats.INT++; game.levelUpData.attributePoints--; }
            if (e.key === '4') { game.levelUpData.tempStats.STA++; game.levelUpData.attributePoints--; }
        } else {
            if (e.key === ' ' || e.key === 'Enter') {
                game.player.stats = { ...game.levelUpData.tempStats };
                recalculateDerivedStats();
                game.state = 'playing';
                addMessage("Stats updated!");
            }
        }
        return;
    }

    // Merchant interactions
    if (game.state === 'merchant') {
        handleMerchantInput(e);
        return;
    }

    // Inventory screen handling
    if (game.state === 'inventory') {
        handleInventoryInput(e);
        return;
    }

    // Playing state - hotkeys and movement
    if (game.state === 'playing') {
        // Action hotkeys (1-4)
        if (['1', '2', '3', '4'].includes(e.key)) {
            if (typeof handleActionHotkey === 'function') {
		handleActionHotkey(parseInt(e.key), game.player);
            }
            return;
        }

        // Open inventory
        if (e.key === 'i' || e.key === 'I') {
            game.state = 'inventory';
            game.inventoryTab = 0;
            return;
        }

        // Open skills menu
        if (e.key === 'k' || e.key === 'K') {
            game.state = 'skills';
            return;
        }

        // Pickup items
        if (e.key === 'g' || e.key === 'G') {
            if (typeof tryPickupLootAtPosition === 'function') {
                tryPickupLootAtPosition(Math.floor(game.player.gridX), Math.floor(game.player.gridY));
            }
            return;
        }
    }
});

// Key up - mark as released
window.addEventListener('keyup', e => {
    keys[e.key] = false;
});

/**
 * Handle merchant screen input
 */
function handleMerchantInput(e) {
    if (!game.merchantMode) game.merchantMode = 'menu';

    if (game.merchantMode === 'menu') {
        if (e.key === ' ') {
            game.state = 'playing';
            game.merchantMode = 'menu';
            game.merchantMsg = "";
        }
        if (e.key === '1') {
            game.merchantMode = 'buy';
            game.merchantMsg = "";
        }
        if (e.key === '2') {
            game.merchantMode = 'sell';
            game.inventoryTab = 0;
        }
    } else if (game.merchantMode === 'buy') {
        if (e.key === 'Escape') {
            game.merchantMode = 'menu';
            game.merchantMsg = "";
        }
        if (e.key === ' ') {
            game.state = 'playing';
            game.merchantMode = 'menu';
            game.merchantMsg = "";
        }

        if (e.key === '1') {
            if (game.gold >= 30) {
                game.gold -= 30;
                const pot = game.player.inventory.find(i => i.name === 'Health Potion');
                if (pot) pot.count++;
                else game.player.inventory.push({
                    name: 'Health Potion',
                    count: 1,
                    type: 'consumable',
                    description: 'Restores 50 HP'
                });
                game.merchantMsg = "Bought Health Potion!";
                addMessage("Bought Health Potion");
            } else {
                game.merchantMsg = "Not enough gold!";
            }
        }
        // Starter Weapons
        if (e.key === '2') {
            const result = typeof purchaseFromMerchant === 'function' 
                ? purchaseFromMerchant('Rusty Broadsword')
                : { success: false, message: 'Shop not loaded' };
            game.merchantMsg = result.message;
            if (result.success) addMessage(result.message);
        }
        if (e.key === '3') {
            const result = typeof purchaseFromMerchant === 'function' 
                ? purchaseFromMerchant('Stone Club')
                : { success: false, message: 'Shop not loaded' };
            game.merchantMsg = result.message;
            if (result.success) addMessage(result.message);
        }
        if (e.key === '4') {
            const result = typeof purchaseFromMerchant === 'function' 
                ? purchaseFromMerchant('Ember Wand')
                : { success: false, message: 'Shop not loaded' };
            game.merchantMsg = result.message;
            if (result.success) addMessage(result.message);
        }
        if (e.key === '5') {
            const result = typeof purchaseFromMerchant === 'function' 
                ? purchaseFromMerchant('Hunting Shortbow')
                : { success: false, message: 'Shop not loaded' };
            game.merchantMsg = result.message;
            if (result.success) addMessage(result.message);
        }
    } else if (game.merchantMode === 'sell') {
        if (e.key === 'Escape') {
            game.merchantMode = 'menu';
        }
        if (e.key === 'ArrowLeft') {
            game.inventoryTab = (game.inventoryTab - 1 + 4) % 4;
        }
        if (e.key === 'ArrowRight') {
            game.inventoryTab = (game.inventoryTab + 1) % 4;
        }

        // Selling items
        if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
            const types = ['weapon', 'armor', 'consumable', 'material'];
            const targetType = types[game.inventoryTab];
            const filteredItems = game.player.inventory.filter(i => i.type === targetType);
            const index = parseInt(e.key) - 1;

            if (index >= 0 && index < filteredItems.length) {
                const item = filteredItems[index];
                const itemData = typeof EQUIPMENT_DATA !== 'undefined' ? EQUIPMENT_DATA[item.name] : null;
                const sellPrice = itemData ? Math.floor(itemData.goldValue / 2) : Math.floor((item.goldValue || 1) / 2);

                game.gold += sellPrice;
                item.count--;
                addMessage(`Sold ${item.name} for ${sellPrice} gold`);

                if (item.count <= 0) {
                    const realIndex = game.player.inventory.indexOf(item);
                    game.player.inventory.splice(realIndex, 1);
                }
            }
        }
    }
}

/**
 * Handle inventory screen input
 */
function handleInventoryInput(e) {
    // ESC to close inventory
    if (e.key === 'Escape') {
        game.state = 'playing';
        return;
    }

    // Tab switching
    if (e.key === 'ArrowLeft') {
        game.inventoryTab = (game.inventoryTab - 1 + 6) % 6;
    }
    if (e.key === 'ArrowRight') {
        game.inventoryTab = (game.inventoryTab + 1) % 6;
    }

    // Inspect tab navigation
    if (game.inventoryTab === 5) {
        if (e.key === 'ArrowUp') {
            game.inspectIndex = Math.max(0, (game.inspectIndex || 0) - 1);
        }
        if (e.key === 'ArrowDown') {
            game.inspectIndex = Math.min(
                game.player.inventory.length - 1,
                (game.inspectIndex || 0) + 1
            );
        }
    }

    // EQUIPPED tab - unequip items
    if (game.inventoryTab === 4) {
        if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
            const slots = ['HEAD', 'CHEST', 'LEGS', 'FEET', 'MAIN', 'OFF'];
            const slotIndex = parseInt(e.key) - 1;
            const slot = slots[slotIndex];

            if (game.player.equipped[slot]) {
                const item = game.player.equipped[slot];
                game.player.inventory.push({ ...item, count: 1 });
                game.player.equipped[slot] = null;
                addMessage(`Unequipped ${item.name}`);
            }
        }
    }

    // Other tabs - use/equip items
    if (game.inventoryTab < 4) {
        if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
            const index = parseInt(e.key) - 1;
            const types = ['weapon', 'armor', 'consumable', 'material'];
            const targetType = types[game.inventoryTab];
            const filteredItems = game.player.inventory.filter(i => i.type === targetType);

            if (index >= 0 && index < filteredItems.length) {
                const item = filteredItems[index];

                if (item.type === 'weapon' || item.type === 'armor') {
                    // Equip item
                    if (typeof equipItem === 'function') {
                        equipItem(item);
                    }
                } else if (item.type === 'consumable') {
                    // Use item
                    if (typeof useItem === 'function') {
                        useItem(index);
                    }
                }
            }
        }
    }
}

/**
 * Calculate 8-directional direction from delta x/y
 * Uses 45-degree sectors to determine direction
 */
function getDirectionFromDelta(dx, dy) {
    if (dx === 0 && dy === 0) return null;

    // Calculate angle in degrees (0 = right, 90 = down, etc.)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Map angle to 8 directions using 45-degree sectors
    // Each sector is 45 degrees wide, centered on the direction
    if (angle >= -22.5 && angle < 22.5) return 'right';
    if (angle >= 22.5 && angle < 67.5) return 'down-right';
    if (angle >= 67.5 && angle < 112.5) return 'down';
    if (angle >= 112.5 && angle < 157.5) return 'down-left';
    if (angle >= 157.5 || angle < -157.5) return 'left';
    if (angle >= -157.5 && angle < -112.5) return 'up-left';
    if (angle >= -112.5 && angle < -67.5) return 'up';
    if (angle >= -67.5 && angle < -22.5) return 'up-right';

    return null;
}

/**
 * Handle movement input - checks held keys and initiates movement
 * Supports 8-directional movement via simultaneous key presses
 */
function handleMovementInput() {
    if (!game.player || game.player.isMoving) return;
    if (game.state !== 'playing') return;

    // Check which directional keys are held
    const up = keys['w'] || keys['W'] || keys['ArrowUp'];
    const down = keys['s'] || keys['S'] || keys['ArrowDown'];
    const left = keys['a'] || keys['A'] || keys['ArrowLeft'];
    const right = keys['d'] || keys['D'] || keys['ArrowRight'];

    // Determine direction based on held keys
    // Check diagonals first (two keys held)
    if (up && left) {
        startPlayerMove('up-left');
    } else if (up && right) {
        startPlayerMove('up-right');
    } else if (down && left) {
        startPlayerMove('down-left');
    } else if (down && right) {
        startPlayerMove('down-right');
    }
    // Cardinal directions (single key)
    else if (up) {
        startPlayerMove('up');
    } else if (down) {
        startPlayerMove('down');
    } else if (left) {
        startPlayerMove('left');
    } else if (right) {
        startPlayerMove('right');
    }
}

/**
 * Check for interactions on the tile the player is standing on
 */
function checkTileInteractions(player) {
    const x = player.gridX;
    const y = player.gridY;
    const tile = game.map[y]?.[x];

    if (!tile) return;

    // Exit tile - advance floor
    if (tile.type === 'exit') {
        addMessage("Found the exit! Descending deeper...");
        advanceToNextFloor();
        return;
    }

    // Merchant interaction
    if (game.merchant) {
        const dx = Math.abs(x - game.merchant.x);
        const dy = Math.abs(y - game.merchant.y);
        if (dx <= 1 && dy <= 1 && !game.merchantVisited) {
            game.state = 'merchant';
            game.merchantMsg = "";
            game.merchantVisited = true;
        }
    }

    // Auto-pickup loot
    if (typeof getLootPileAt === 'function') {
        const pile = getLootPileAt(x, y);
        if (pile) {
            pickupLootPile(pile);
        }
    }
}

// ==================== CANVAS CLICK HANDLERS ====================

// Wait for canvas to be available
const setupCanvasHandlers = () => {
    const canvas = document.getElementById('gameCanvas') || 
                   document.getElementById('canvas') || 
                   document.querySelector('canvas');
    
    if (!canvas) {
        setTimeout(setupCanvasHandlers, 100);
        return;
    }

    // LEFT CLICK - Movement and target selection
    canvas.addEventListener('click', (e) => {
        if (game.state !== 'playing') return;

        // Close context menu if open
        if (contextMenu.visible) {
            contextMenu.visible = false;
            return;
        }

        // Convert screen coords to grid coords
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Account for tracker offset
        const trackerWidth = typeof TRACKER_WIDTH !== 'undefined' ? TRACKER_WIDTH : 400;
        const viewX = clickX - trackerWidth;
        const viewY = clickY;

        // If clicked in tracker area, ignore
        if (viewX < 0) return;

        const tileSize = (typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 32) * 
                         (typeof ZOOM_LEVEL !== 'undefined' ? ZOOM_LEVEL : 2);
        const camX = game.camera ? game.camera.x : 0;
        const camY = game.camera ? game.camera.y : 0;

        const gridX = Math.floor(viewX / tileSize + camX);
        const gridY = Math.floor(viewY / tileSize + camY);

        // Check if clicked on an enemy
        const clickedEnemy = game.enemies.find(enemy =>
            Math.floor(enemy.gridX) === gridX && Math.floor(enemy.gridY) === gridY
        );

        if (clickedEnemy) {
            // Attack or engage the enemy
            const dist = Math.max(
                Math.abs(game.player.gridX - clickedEnemy.gridX),
                Math.abs(game.player.gridY - clickedEnemy.gridY)
            );

            if (dist <= (game.player.combat?.attackRange || 1)) {
                // In range - engage
                const oldTarget = game.player.combat.currentTarget;
                if (oldTarget && oldTarget !== clickedEnemy && oldTarget.combat) {
                    disengageCombat(oldTarget);
                }
                disengageCombat(game.player);
                engageCombat(game.player, clickedEnemy);
                return;
            }
        }

        // No enemy clicked - move toward position
        if (game.player.combat.isInCombat && game.player.combat.currentTarget) {
            const targetDist = Math.max(
                Math.abs(gridX - Math.floor(game.player.combat.currentTarget.gridX)),
                Math.abs(gridY - Math.floor(game.player.combat.currentTarget.gridY))
            );

            if (targetDist > 3) {
                const enemy = game.player.combat.currentTarget;
                disengageCombat(game.player);
                if (enemy && enemy.combat) {
                    disengageCombat(enemy);
                }
                addMessage("Escaped from combat!");
            }
        }

        // Set movement target
        game.player.manualMoveTarget = { x: gridX, y: gridY };

        const dx = gridX - game.player.gridX;
        const dy = gridY - game.player.gridY;

        // Calculate 8-directional movement from click position
        const dir = getDirectionFromDelta(dx, dy);

        if (dir && typeof startPlayerMove === 'function') {
            startPlayerMove(dir);
        }
    });

    // RIGHT CLICK - Context menu
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();

        if (game.state !== 'playing') return;

        inspectPopup.visible = false;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const trackerWidth = typeof TRACKER_WIDTH !== 'undefined' ? TRACKER_WIDTH : 400;
        const viewX = clickX - trackerWidth;
        const viewY = clickY;

        if (viewX < 0) return;

        const tileSize = (typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 32) * 
                         (typeof ZOOM_LEVEL !== 'undefined' ? ZOOM_LEVEL : 2);
        const camX = game.camera ? game.camera.x : 0;
        const camY = game.camera ? game.camera.y : 0;

        const gridX = Math.floor(viewX / tileSize + camX);
        const gridY = Math.floor(viewY / tileSize + camY);

        let target = null;
        let targetType = null;
        let options = [];

        // Check for enemy
        const clickedEnemy = game.enemies.find(enemy =>
            Math.floor(enemy.gridX) === gridX && Math.floor(enemy.gridY) === gridY
        );

        if (clickedEnemy) {
            target = clickedEnemy;
            targetType = 'enemy';
            options = [
                { text: 'Attack', action: 'attack' },
                { text: 'Inspect', action: 'inspect' },
                { text: 'Cancel', action: 'cancel' }
            ];
        }
        // Check for NPC (merchant)
        else if (game.merchant) {
            const dx = Math.abs(gridX - game.merchant.x);
            const dy = Math.abs(gridY - game.merchant.y);
            if (dx <= 1 && dy <= 1) {
                target = game.merchant;
                targetType = 'npc';
                options = [
                    { text: 'Talk', action: 'talk' },
                    { text: 'Inspect', action: 'inspect' },
                    { text: 'Cancel', action: 'cancel' }
                ];
            }
        }

        // Empty tile
        if (!target) {
            target = { x: gridX, y: gridY };
            targetType = 'tile';
            options = [
                { text: 'Walk here', action: 'walk' },
                { text: 'Cancel', action: 'cancel' }
            ];
        }

        contextMenu.visible = true;
        contextMenu.x = clickX;
        contextMenu.y = clickY;
        contextMenu.target = target;
        contextMenu.targetType = targetType;
        contextMenu.options = options;
    });

    console.log('✓ Canvas click handlers initialized');
};

// Initialize canvas handlers
setupCanvasHandlers();

/**
 * Execute context menu action
 */
function executeContextAction(action, target, targetType) {
    switch (action) {
        case 'attack':
            if (targetType === 'enemy') {
                engageCombat(game.player, target);
            }
            break;

        case 'inspect':
            inspectPopup.visible = true;
            inspectPopup.target = target;
            inspectPopup.targetType = targetType;
            break;

        case 'talk':
            if (targetType === 'npc') {
                game.state = 'merchant';
                game.merchantMsg = "";
            }
            break;

        case 'walk':
            if (targetType === 'tile') {
                game.player.manualMoveTarget = { x: target.x, y: target.y };
                const dx = target.x - game.player.gridX;
                const dy = target.y - game.player.gridY;

                // Calculate 8-directional movement
                const dir = getDirectionFromDelta(dx, dy);

                if (dir && typeof startPlayerMove === 'function') {
                    startPlayerMove(dir);
                }
            }
            break;

        case 'cancel':
        default:
            break;
    }
}

/**
 * Close popups when player is hit
 */
function onPlayerHit() {
    if (inspectPopup.visible) {
        inspectPopup.visible = false;
        addMessage("Inspection interrupted!");
    }
    if (contextMenu.visible) {
        contextMenu.visible = false;
    }
}

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const InputHandlerSystem = {
    name: 'input-handler',
    
    // No init needed - event listeners set up on load
    
    update(dt) {
        // Handle continuous movement input each frame
        handleMovementInput();
    }
    
    // No cleanup needed - event listeners persist
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('input-handler', InputHandlerSystem, 10);
} else {
    console.warn('⚠️ SystemManager not found - input-handler running standalone');
}

// ============================================================================
// EXPORTS
// ============================================================================

window.onPlayerHit = onPlayerHit;
window.contextMenu = contextMenu;
window.inspectPopup = inspectPopup;
window.keys = keys;
window.handleMovementInput = handleMovementInput;
window.checkTileInteractions = checkTileInteractions;
window.executeContextAction = executeContextAction;
window.getDirectionFromDelta = getDirectionFromDelta;

console.log('✅ Input handler loaded');
