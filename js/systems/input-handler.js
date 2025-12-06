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

    // PRIORITY 1: Game state overlays (character, map, settings, skills) - check FIRST
    // Close character overlay on ESC (hotkey 'C' handled by icon-sidebar)
    if (e.key === 'Escape' && game.state === 'character') {
        game.state = 'playing';
        if (window.sidebarState) window.sidebarState.activeOverlay = null;
        return;
    }

    // Close map overlay on ESC (hotkey 'M' handled by icon-sidebar)
    if (e.key === 'Escape' && game.state === 'map') {
        game.state = 'playing';
        if (window.sidebarState) window.sidebarState.activeOverlay = null;
        return;
    }

    // Close settings overlay on ESC (hotkey 'O' handled by icon-sidebar)
    if (e.key === 'Escape' && game.state === 'settings') {
        game.state = 'playing';
        if (window.sidebarState) window.sidebarState.activeOverlay = null;
        return;
    }

    // Close skills menu on ESC (hotkey 'K' handled by icon-sidebar)
    if (e.key === 'Escape' && game.state === 'skills') {
        game.state = 'playing';
        return;
    }

    // PRIORITY 2: Context menu and inspect popup (only if game.state === 'playing')
    // Close inspect popup on ESC
    if (e.key === 'Escape' && inspectPopup.visible && game.state === 'playing') {
        inspectPopup.visible = false;
        inspectPopup.target = null;
        inspectPopup.tab = 0;
        return;
    }

    // Tab switching for inspect popup
    if (inspectPopup.visible && inspectPopup.targetType === 'enemy') {
        // Shift+Tab: Cycle through enemies
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            const visibleEnemies = game.enemies.filter(enemy => {
                const tile = game.map?.[Math.floor(enemy.gridY)]?.[Math.floor(enemy.gridX)];
                return tile && tile.visible && enemy.hp > 0;
            });
            if (visibleEnemies.length > 1) {
                const currentIndex = visibleEnemies.indexOf(inspectPopup.target);
                const nextIndex = (currentIndex + 1) % visibleEnemies.length;
                inspectPopup.target = visibleEnemies[nextIndex];
            }
            return;
        }
        // Tab: Cycle through tabs
        if (e.key === 'Tab') {
            e.preventDefault();
            inspectPopup.tab = (inspectPopup.tab + 1) % 4;
            return;
        }
        // Arrow keys: Cycle through tabs
        if (e.key === 'ArrowRight') {
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
        // Tab targeting
        if (e.key === 'Tab') {
            e.preventDefault(); // Prevent default tab behavior
            if (typeof handleTabTargeting === 'function') {
                handleTabTargeting(game.player);
            }
            return;
        }

        // Action hotkeys (1-4) - Active Combat System
        if (['1', '2', '3', '4'].includes(e.key)) {
            if (typeof handleActiveCombatHotkey === 'function') {
                handleActiveCombatHotkey(parseInt(e.key), game.player);
            } else if (typeof handleActionHotkey === 'function') {
                // Fallback to old system
                handleActionHotkey(parseInt(e.key), game.player);
            }
            return;
        }

        // Open inventory (blocked during combat)
        if (e.key === 'i' || e.key === 'I') {
            if (game.player?.inCombat) {
                if (typeof addMessage === 'function') {
                    addMessage('Cannot access inventory during combat!');
                }
                return;
            }
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
    // ESC to close inventory (hotkey 'E' handled by icon-sidebar)
    if (e.key === 'Escape') {
        game.state = 'playing';
        if (window.sidebarState) window.sidebarState.activeOverlay = null;
        return;
    }

    // Tab switching (now 5 tabs instead of 6)
    if (e.key === 'ArrowLeft') {
        game.inventoryTab = (game.inventoryTab - 1 + 5) % 5;
        game.selectedItemIndex = 0; // Reset selection when changing tabs
    }
    if (e.key === 'ArrowRight') {
        game.inventoryTab = (game.inventoryTab + 1) % 5;
        game.selectedItemIndex = 0; // Reset selection when changing tabs
    }

    // Item navigation for Weapons, Armor, Consumables, Items tabs
    if (game.inventoryTab < 4) {
        const types = ['weapon', 'armor', 'consumable', 'material'];
        const targetType = types[game.inventoryTab];
        const filteredItems = game.player.inventory.filter(i => i.type === targetType);

        if (e.key === 'ArrowUp') {
            game.selectedItemIndex = Math.max(0, (game.selectedItemIndex || 0) - 1);
        }
        if (e.key === 'ArrowDown') {
            game.selectedItemIndex = Math.min(
                filteredItems.length - 1,
                (game.selectedItemIndex || 0) + 1
            );
        }

        // Space to equip/use selected item
        if (e.key === ' ') {
            if (filteredItems.length > 0 && game.selectedItemIndex >= 0 && game.selectedItemIndex < filteredItems.length) {
                const selectedItem = filteredItems[game.selectedItemIndex];
                const itemData = EQUIPMENT_DATA[selectedItem.name] || selectedItem;

                if (selectedItem.type === 'weapon' || selectedItem.type === 'armor') {
                    // Equip item
                    const slot = itemData.slot || 'MAIN';

                    // Unequip current item if any
                    if (game.player.equipped[slot]) {
                        const currentItem = game.player.equipped[slot];
                        game.player.inventory.push({ ...currentItem, count: 1 });
                    }

                    // Equip new item
                    game.player.equipped[slot] = { ...selectedItem };

                    // Remove from inventory
                    const invIndex = game.player.inventory.indexOf(selectedItem);
                    if (invIndex !== -1) {
                        if (selectedItem.count > 1) {
                            selectedItem.count--;
                        } else {
                            game.player.inventory.splice(invIndex, 1);
                            game.selectedItemIndex = Math.max(0, game.selectedItemIndex - 1);
                        }
                    }

                    // Recalculate stats
                    if (typeof recalculatePlayerStats === 'function') {
                        recalculatePlayerStats(game.player);
                    }

                    // Update action hotkeys if weapon changed
                    if (slot === 'MAIN' && typeof updateActionHotkeys === 'function') {
                        updateActionHotkeys(game.player);
                    }

                    addMessage(`Equipped ${selectedItem.name}`);
                } else if (selectedItem.type === 'consumable') {
                    // Use consumable
                    if (selectedItem.name === 'Health Potion') {
                        const healAmount = 50;
                        game.player.hp = Math.min(game.player.maxHp, game.player.hp + healAmount);
                        addMessage(`Used Health Potion. Restored ${healAmount} HP.`);

                        // Decrease count or remove
                        if (selectedItem.count > 1) {
                            selectedItem.count--;
                        } else {
                            const invIndex = game.player.inventory.indexOf(selectedItem);
                            if (invIndex !== -1) {
                                game.player.inventory.splice(invIndex, 1);
                                game.selectedItemIndex = Math.max(0, game.selectedItemIndex - 1);
                            }
                        }
                    }
                }
            }
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

                // Determine item type
                let itemType = 'weapon';
                if (['HEAD', 'CHEST', 'LEGS', 'FEET', 'OFF'].includes(slot)) {
                    itemType = 'armor';
                }

                game.player.inventory.push({ ...item, count: 1, type: itemType });
                game.player.equipped[slot] = null;

                // Recalculate stats
                if (typeof recalculatePlayerStats === 'function') {
                    recalculatePlayerStats(game.player);
                }

                // Update action hotkeys if weapon changed
                if (slot === 'MAIN' && typeof updateActionHotkeys === 'function') {
                    updateActionHotkeys(game.player);
                }

                addMessage(`Unequipped ${item.name}`);
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
 * Handle movement input - continuous movement based on held keys
 * Supports 8-directional movement with .125 tile precision
 * @param {number} deltaTime - Time since last frame in milliseconds
 */
function handleMovementInput(deltaTime) {
    if (!game.player) return;
    if (game.state !== 'playing') return;

    // Check which directional keys are held
    const up = keys['w'] || keys['W'] || keys['ArrowUp'];
    const down = keys['s'] || keys['S'] || keys['ArrowDown'];
    const left = keys['a'] || keys['A'] || keys['ArrowLeft'];
    const right = keys['d'] || keys['D'] || keys['ArrowRight'];

    // If no movement keys are held, stop and snap to .125 increment
    if (!up && !down && !left && !right) {
        if (game.player.isMoving && typeof cancelPlayerMove === 'function') {
            cancelPlayerMove();
        }
        return;
    }

    // Determine direction based on held keys
    let direction = null;

    // Check diagonals first (two keys held)
    if (up && left) {
        direction = 'up-left';
    } else if (up && right) {
        direction = 'up-right';
    } else if (down && left) {
        direction = 'down-left';
    } else if (down && right) {
        direction = 'down-right';
    }
    // Cardinal directions (single key)
    else if (up) {
        direction = 'up';
    } else if (down) {
        direction = 'down';
    } else if (left) {
        direction = 'left';
    } else if (right) {
        direction = 'right';
    }

    // Move player in the determined direction
    if (direction && typeof movePlayerContinuous === 'function') {
        movePlayerContinuous(direction, deltaTime || 16.67); // Default to ~60fps
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

        // If context menu is visible, let right-click-init.js handle the click
        // Don't close it here - that would prevent the menu action from being processed
        if (window.contextMenu?.visible) {
            return;
        }

        // Don't auto-walk if inspect popup is visible
        if (window.inspectPopup?.visible) {
            return;
        }

        // Don't auto-walk if context menu just closed (prevents walk when clicking inspect)
        if (window.contextMenuJustClosed) {
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
            // ACTIVE COMBAT: Left-click targets enemy (doesn't auto-attack)
            const oldTarget = game.player.combat?.currentTarget;
            if (oldTarget && oldTarget !== clickedEnemy && oldTarget.combat) {
                disengageCombat(oldTarget);
            }
            disengageCombat(game.player);
            engageCombat(game.player, clickedEnemy);
            return;
        }

        // ACTIVE COMBAT: No enemy clicked - do nothing (no auto-walk)
        // Player must use WASD to move
        return;

        // (Old auto-walk code disabled for active combat)
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

        case 'pickup':
            if (typeof window.pickupLootPile === 'function' && targetType === 'loot') {
                console.log('Picking up loot pile');
                window.pickupLootPile(target);
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
        // Handle continuous movement input each frame with deltaTime
        handleMovementInput(dt);
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
