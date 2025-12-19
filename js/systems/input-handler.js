// === js/input/input-handler.js ===
// Enhanced with right-click context menu, inspect functionality, and skill action hotkeys
// UPDATED: Registers with SystemManager

// Track held keys for smooth movement
const keys = {};

// Context menu and inspect popup state are defined in right-click-init.js
// We just ensure they exist with defaults if not yet loaded
if (!window.contextMenu) {
    window.contextMenu = { visible: false, x: 0, y: 0, target: null, targetType: null, options: [] };
}
if (!window.inspectPopup) {
    window.inspectPopup = { visible: false, target: null, targetType: null, tab: 0 };
}

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
        if (window.sidebarState) window.sidebarState.activeOverlay = null;
        return;
    }

    // JOURNAL UI - Handle all input when journal is open
    if (game.state === 'journal') {
        if (typeof JournalUI !== 'undefined') {
            JournalUI.handleInput(e.key);
            e.preventDefault();
        }
        return;
    }

    // Chest UI input handling
    if (game.state === 'chest') {
        if (typeof handleChestKey === 'function' && handleChestKey(e.key)) {
            return;
        }
    }

    // Shrine UI input handling
    if (game.state === 'shrine') {
        if (typeof handleShrineInput === 'function' && handleShrineInput(e)) {
            return;
        }
    }

    // PRIORITY 2: Context menu and inspect popup (only if game.state === 'playing')
    // ESC handling for context menu/inspect popup is in right-click-init.js

    // Tab switching for inspect popup
    if (window.inspectPopup.visible && window.inspectPopup.targetType === 'enemy') {
        // Shift+Tab: Cycle through enemies
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            const visibleEnemies = game.enemies.filter(enemy => {
                const tile = game.map?.[Math.floor(enemy.gridY)]?.[Math.floor(enemy.gridX)];
                return tile && tile.visible && enemy.hp > 0;
            });
            if (visibleEnemies.length > 1) {
                const currentIndex = visibleEnemies.indexOf(window.inspectPopup.target);
                const nextIndex = (currentIndex + 1) % visibleEnemies.length;
                window.inspectPopup.target = visibleEnemies[nextIndex];
            }
            return;
        }
        // Tab: Cycle through tabs
        if (e.key === 'Tab') {
            e.preventDefault();
            window.inspectPopup.tab = (window.inspectPopup.tab + 1) % 4;
            return;
        }
        // Arrow keys: Cycle through tabs
        if (e.key === 'ArrowRight') {
            window.inspectPopup.tab = (window.inspectPopup.tab + 1) % 4;
            return;
        }
        if (e.key === 'ArrowLeft') {
            window.inspectPopup.tab = (window.inspectPopup.tab + 3) % 4; // +3 is same as -1 mod 4
            return;
        }
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

        // Action hotkeys (3-4) for consumables
        // Attacks are triggered by left-click only (uses combo system: 1, 2, special)
        if (['3', '4'].includes(e.key)) {
            e.preventDefault();
            // Clear this key from movement state to prevent conflicts
            keys[e.key] = false;

            const keyNum = parseInt(e.key);

            // Hotkeys 3-4: Consumables (use existing system)
            if (typeof handleActiveCombatHotkey === 'function') {
                handleActiveCombatHotkey(keyNum, game.player);
            } else if (typeof handleActionHotkey === 'function') {
                handleActionHotkey(keyNum, game.player);
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

        // Descent interaction (D key) - Go to next floor
        if (e.key === 'd' || e.key === 'D') {
            const playerX = Math.floor(game.player.gridX);
            const playerY = Math.floor(game.player.gridY);
            const tile = game.map[playerY]?.[playerX];

            if (tile && tile.type === 'exit') {
                console.log('[Input] D pressed on exit tile - descending!');
                if (typeof addMessage === 'function') {
                    addMessage("Descending deeper into the dungeon...", 'info');
                }
                if (typeof advanceToNextFloor === 'function') {
                    advanceToNextFloor();
                } else {
                    // Fallback: manually increment floor and regenerate
                    game.floor = (game.floor || 1) + 1;
                    if (typeof generateBlobDungeon === 'function') {
                        game.enemies = [];
                        generateBlobDungeon();
                    }
                }
                return;
            }
        }

        // Torch toggle (T key) - Also checks for extraction interaction
        if (e.key === 't' || e.key === 'T') {
            // First check if player is on an extraction point
            let onExtractionPoint = false;

            if (typeof ExtractionSystem !== 'undefined' && ExtractionSystem.initialized) {
                const point = ExtractionSystem.getPointAtPlayer();
                if (point && point.isActive()) {
                    // Player is on extraction point - extract instead of torch toggle
                    console.log('[Input] Extraction point found, attempting extract...');
                    ExtractionSystem.tryExtract(point);
                    return;
                }
            }

            // Not on extraction point - toggle torch
            if (typeof toggleTorch === 'function') {
                toggleTorch();
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
                    // Use consumable via useItemByIndex from inventory-system.js
                    // This handles all effect types: heal, deployable, buff, etc.
                    if (typeof useItemByIndex === 'function') {
                        const success = useItemByIndex(game.selectedItemIndex);
                        if (success) {
                            // useItemByIndex handles count decrement and removal
                            // Just update selection if needed
                            const newFilteredItems = game.player.inventory.filter(i => i.type === 'consumable');
                            if (game.selectedItemIndex >= newFilteredItems.length) {
                                game.selectedItemIndex = Math.max(0, newFilteredItems.length - 1);
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

    // Only allow movement when actively playing (dungeon)
    // Use both string and GAME_STATES comparison for safety
    const isPlaying = game.state === 'playing' || game.state === GAME_STATES?.PLAYING;
    if (!isPlaying) return;

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

    // Exit/descent tile - show prompt (D key to descend)
    if (tile.type === 'exit') {
        if (!game.descentPromptShown) {
            addMessage("Press [D] to descend deeper!", 'info');
            game.descentPromptShown = true;
        }
    } else {
        game.descentPromptShown = false;
    }

    // Extraction point interaction
    if (typeof ExtractionSystem !== 'undefined' && ExtractionSystem.initialized) {
        const point = ExtractionSystem.getPointAtPlayer();
        if (point && point.isActive()) {
            // Show extraction prompt
            if (!game.extractionPromptShown) {
                addMessage("Press [T] to extract to the surface!", 'info');
                game.extractionPromptShown = true;
            }
        } else {
            game.extractionPromptShown = false;
        }
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

    // LEFT CLICK - Mouse-driven attack toward cursor
    canvas.addEventListener('click', (e) => {
        // Handle skills overlay clicks (pentagon radar, tabs)
        if (game.state === 'skills' && typeof handleSkillsOverlayClick === 'function') {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            handleSkillsOverlayClick(clickX, clickY);
            return;
        }

        // Handle chest UI clicks
        if (game.state === 'chest' && typeof handleChestClick === 'function') {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            handleChestClick(clickX, clickY);
            return;
        }

        // Handle shrine UI clicks
        if (game.state === 'shrine' && typeof handleShrineClick === 'function') {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            handleShrineClick(clickX, clickY);
            return;
        }

        if (game.state !== 'playing') return;

        // If context menu is visible, let right-click-init.js handle the click
        if (window.contextMenu?.visible) {
            return;
        }

        // Don't attack if inspect popup is visible
        if (window.inspectPopup?.visible) {
            return;
        }

        // Don't attack if context menu just closed
        if (window.contextMenuJustClosed) {
            return;
        }

        // Check if clicked in tracker area - ignore
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const trackerWidth = typeof TRACKER_WIDTH !== 'undefined' ? TRACKER_WIDTH : 400;
        if (clickX < trackerWidth) return;

        // Perform mouse attack toward cursor direction
        // Uses combo system: Attack 1 (left), Attack 2 (right), Attack 3 (special)
        if (typeof performMouseAttack === 'function') {
            performMouseAttack(game.player);
        }
    });

    // RIGHT CLICK - Context menu handled by right-click-init.js
    // Removed duplicate handler to prevent double rendering

    console.log('✓ Canvas click handlers initialized');
};

// Initialize canvas handlers
setupCanvasHandlers();

// executeContextAction is defined in right-click-init.js

/**
 * Close popups when player is hit
 */
function onPlayerHit() {
    if (window.inspectPopup?.visible) {
        window.inspectPopup.visible = false;
        addMessage("Inspection interrupted!");
    }
    if (window.contextMenu?.visible) {
        window.contextMenu.visible = false;
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
// contextMenu and inspectPopup are exported by right-click-init.js
window.keys = keys;
window.handleMovementInput = handleMovementInput;
window.checkTileInteractions = checkTileInteractions;
// executeContextAction is defined in right-click-init.js
window.getDirectionFromDelta = getDirectionFromDelta;

console.log('✅ Input handler loaded');
