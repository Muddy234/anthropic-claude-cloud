// === js/ui/loadout-ui.js ===
// ARC RAIDERS STYLE: Pre-run loadout selection with grid-based inventory

// ============================================================================
// LOADOUT UI - Arc Raiders Style
// ============================================================================

const LoadoutUI = {

    // State
    active: false,
    currentPanel: 1,        // 0=bank, 1=equipment, 2=inventory
    selectedIndex: 0,
    equipmentSlotIndex: 0,
    startingFloor: 1,

    // Scroll positions
    bankScroll: 0,
    inventoryScroll: 0,

    // Layout
    PANEL_WIDTH: 1100,
    PANEL_HEIGHT: 700,

    // Grid settings
    GRID_COLS: 4,
    GRID_ROWS: 6,
    SLOT_SIZE: 50,
    SLOT_GAP: 6,

    // Equipment slots order
    EQUIPMENT_SLOTS: ['HEAD', 'MAIN', 'CHEST', 'OFF', 'LEGS', 'FEET'],

    // Selected items for this run (separate from bank)
    runInventory: [],
    runEquipment: {
        HEAD: null,
        CHEST: null,
        LEGS: null,
        FEET: null,
        MAIN: null,
        OFF: null
    },
    runGold: 0,

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    open() {
        this.active = true;
        this.currentPanel = 1;  // Start on equipment panel
        this.selectedIndex = 0;
        this.equipmentSlotIndex = 0;
        this.startingFloor = 1;
        this.bankScroll = 0;
        this.inventoryScroll = 0;

        // Reset run inventory
        this.runInventory = [];
        this.runEquipment = {
            HEAD: null, CHEST: null, LEGS: null, FEET: null,
            MAIN: null, OFF: null
        };
        this.runGold = 0;

        game.state = GAME_STATES ? GAME_STATES.LOADOUT : 'loadout';
        console.log('[LoadoutUI] Opened - Arc Raiders style');
    },

    close() {
        this.active = false;
        game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
        console.log('[LoadoutUI] Closed');
    },

    // ========================================================================
    // INPUT HANDLING
    // ========================================================================

    handleInput(key) {
        if (!this.active) return;

        switch (key) {
            // Panel switching
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (this.currentPanel === 1) {
                    // In equipment, move selection or switch panel
                    if (this.equipmentSlotIndex % 2 === 0) {
                        this.currentPanel = 0;  // Go to bank
                        this.selectedIndex = 0;
                    } else {
                        this.equipmentSlotIndex--;
                    }
                } else if (this.currentPanel === 2) {
                    // In inventory grid, move left or switch to equipment
                    if (this.selectedIndex % this.GRID_COLS === 0) {
                        this.currentPanel = 1;  // Go to equipment
                        this.equipmentSlotIndex = 1;  // Right side slots
                    } else {
                        this.selectedIndex--;
                    }
                } else {
                    // In bank grid, move left
                    if (this.selectedIndex % this.GRID_COLS > 0) {
                        this.selectedIndex--;
                    }
                }
                break;

            case 'ArrowRight':
            case 'd':
            case 'D':
                if (this.currentPanel === 0) {
                    // In bank grid, move right or switch panel
                    const bankItems = this._getBankItems();
                    if (this.selectedIndex % this.GRID_COLS === this.GRID_COLS - 1 ||
                        this.selectedIndex >= bankItems.length - 1) {
                        this.currentPanel = 1;  // Go to equipment
                        this.equipmentSlotIndex = 0;  // Left side slots
                    } else {
                        this.selectedIndex++;
                    }
                } else if (this.currentPanel === 1) {
                    // In equipment, move or switch to inventory
                    if (this.equipmentSlotIndex % 2 === 1) {
                        this.currentPanel = 2;  // Go to inventory
                        this.selectedIndex = 0;
                    } else {
                        this.equipmentSlotIndex++;
                    }
                } else {
                    // In inventory grid, move right
                    if (this.selectedIndex % this.GRID_COLS < this.GRID_COLS - 1 &&
                        this.selectedIndex < this.runInventory.length - 1) {
                        this.selectedIndex++;
                    }
                }
                break;

            case 'ArrowUp':
            case 'w':
            case 'W':
                if (this.currentPanel === 0) {
                    // Bank grid - move up with scrolling
                    const bankItems = this._getBankItems();
                    if (this.selectedIndex >= this.GRID_COLS) {
                        this.selectedIndex -= this.GRID_COLS;
                        // Scroll up if selection goes above visible area
                        const selectedRow = Math.floor(this.selectedIndex / this.GRID_COLS);
                        if (selectedRow < this.bankScroll) {
                            this.bankScroll = selectedRow;
                        }
                    } else if (this.bankScroll > 0) {
                        // Already at top of visible area, scroll up
                        this.bankScroll--;
                    }
                } else if (this.currentPanel === 1) {
                    // Equipment slots - move up
                    if (this.equipmentSlotIndex >= 2) {
                        this.equipmentSlotIndex -= 2;
                    }
                } else {
                    // Inventory grid - move up
                    if (this.selectedIndex >= this.GRID_COLS) {
                        this.selectedIndex -= this.GRID_COLS;
                    }
                }
                break;

            case 'ArrowDown':
            case 's':
            case 'S':
                if (this.currentPanel === 0) {
                    // Bank grid - move down with scrolling
                    const bankItems = this._getBankItems();
                    const maxVisibleRows = 6;
                    if (this.selectedIndex + this.GRID_COLS < bankItems.length) {
                        this.selectedIndex += this.GRID_COLS;
                        // Scroll down if selection goes below visible area
                        const selectedRow = Math.floor(this.selectedIndex / this.GRID_COLS);
                        if (selectedRow >= this.bankScroll + maxVisibleRows) {
                            this.bankScroll = selectedRow - maxVisibleRows + 1;
                        }
                    }
                } else if (this.currentPanel === 1) {
                    // Equipment slots - move down
                    if (this.equipmentSlotIndex < 4) {
                        this.equipmentSlotIndex += 2;
                    }
                } else {
                    // Inventory grid - move down
                    if (this.selectedIndex + this.GRID_COLS < this.runInventory.length) {
                        this.selectedIndex += this.GRID_COLS;
                    }
                }
                break;

            case 'Enter':
            case 'e':
            case 'E':
            case ' ':
                this._handleSelect();
                break;

            case 'q':
            case 'Q':
                // Quick select basic loadout
                this._selectBasicLoadout();
                break;

            case 'r':
            case 'R':
                // Start run
                this._startRun();
                break;

            case 'Tab':
                // Cycle panels
                this.currentPanel = (this.currentPanel + 1) % 3;
                this.selectedIndex = 0;
                break;

            case 'Escape':
                this.close();
                break;

            case 'PageUp':
                this._adjustStartingFloor(1);
                break;

            case 'PageDown':
                this._adjustStartingFloor(-1);
                break;
        }
    },

    _handleSelect() {
        if (this.currentPanel === 0) {
            // Bank panel - transfer to inventory or equip
            this._transferFromBank();
        } else if (this.currentPanel === 1) {
            // Equipment panel - unequip to inventory
            this._unequipItem();
        } else {
            // Inventory panel - equip or return to bank
            this._handleInventorySelect();
        }
    },

    // ========================================================================
    // ITEM TRANSFER LOGIC
    // ========================================================================

    _getBankItems() {
        const bankItems = persistentState?.bank?.items || [];
        // Filter out items already in run inventory/equipment
        return bankItems.filter((item, idx) => {
            // Check if this bank index is already used
            const inRunInv = this.runInventory.some(ri => ri.bankIndex === idx);
            const inEquip = Object.values(this.runEquipment).some(e => e && e.bankIndex === idx);
            return !inRunInv && !inEquip;
        }).map((item, filteredIdx, arr) => {
            // Find original bank index
            let originalIdx = 0;
            let count = 0;
            const allBankItems = persistentState?.bank?.items || [];
            for (let i = 0; i < allBankItems.length; i++) {
                const inRunInv = this.runInventory.some(ri => ri.bankIndex === i);
                const inEquip = Object.values(this.runEquipment).some(e => e && e.bankIndex === i);
                if (!inRunInv && !inEquip) {
                    if (count === filteredIdx) {
                        originalIdx = i;
                        break;
                    }
                    count++;
                }
            }
            return { item, bankIndex: originalIdx };
        });
    },

    _transferFromBank() {
        const bankItems = this._getBankItems();
        if (this.selectedIndex >= bankItems.length) return;

        const { item, bankIndex } = bankItems[this.selectedIndex];

        // If weapon or armor, try to equip directly
        if (item.type === 'weapon') {
            const slot = 'MAIN';  // Default to main hand
            if (this.runEquipment[slot]) {
                // Swap - move current to inventory
                this.runInventory.push(this.runEquipment[slot]);
            }
            this.runEquipment[slot] = { ...item, bankIndex };
            console.log(`[LoadoutUI] Equipped ${item.name} to ${slot}`);
        } else if (item.type === 'armor') {
            const slot = item.slot || 'CHEST';
            if (this.runEquipment[slot]) {
                // Swap - move current to inventory
                this.runInventory.push(this.runEquipment[slot]);
            }
            this.runEquipment[slot] = { ...item, bankIndex };
            console.log(`[LoadoutUI] Equipped ${item.name} to ${slot}`);
        } else {
            // Consumables/materials go to inventory
            if (this.runInventory.length < 15) {  // Max inventory slots
                this.runInventory.push({ ...item, bankIndex });
                console.log(`[LoadoutUI] Added ${item.name} to inventory`);
            } else {
                console.log('[LoadoutUI] Inventory full!');
            }
        }
    },

    _unequipItem() {
        const slotName = this.EQUIPMENT_SLOTS[this.equipmentSlotIndex];
        const equipped = this.runEquipment[slotName];

        if (!equipped) return;

        // Move to inventory
        if (this.runInventory.length < 15) {
            this.runInventory.push(equipped);
            this.runEquipment[slotName] = null;
            console.log(`[LoadoutUI] Unequipped ${equipped.name}`);
        } else {
            console.log('[LoadoutUI] Inventory full!');
        }
    },

    _handleInventorySelect() {
        if (this.selectedIndex >= this.runInventory.length) return;

        const item = this.runInventory[this.selectedIndex];

        // Try to equip if weapon/armor
        if (item.type === 'weapon') {
            const slot = 'MAIN';
            if (this.runEquipment[slot]) {
                // Swap
                const old = this.runEquipment[slot];
                this.runEquipment[slot] = item;
                this.runInventory[this.selectedIndex] = old;
            } else {
                this.runEquipment[slot] = item;
                this.runInventory.splice(this.selectedIndex, 1);
            }
        } else if (item.type === 'armor') {
            const slot = item.slot || 'CHEST';
            if (this.runEquipment[slot]) {
                // Swap
                const old = this.runEquipment[slot];
                this.runEquipment[slot] = item;
                this.runInventory[this.selectedIndex] = old;
            } else {
                this.runEquipment[slot] = item;
                this.runInventory.splice(this.selectedIndex, 1);
            }
        } else {
            // Return consumable to bank (remove from run inventory)
            this.runInventory.splice(this.selectedIndex, 1);
            if (this.selectedIndex >= this.runInventory.length && this.selectedIndex > 0) {
                this.selectedIndex--;
            }
        }
    },

    _selectBasicLoadout() {
        // Clear current selection
        this.runInventory = [];
        this.runEquipment = {
            HEAD: null, CHEST: null, LEGS: null, FEET: null,
            MAIN: null, OFF: null
        };

        // Add basic loadout items (not from bank - free items)
        const basicWeapon = {
            name: 'Rusty Shortsword',
            type: 'weapon',
            damage: 8,
            rarity: 'common',
            attackSpeed: 1.5,
            attackRange: 1,
            element: 'physical',
            isFreeItem: true  // Mark as free (not from bank)
        };

        this.runEquipment.MAIN = basicWeapon;

        // Add health potions
        this.runInventory.push({
            name: 'Weak Health Potion',
            type: 'consumable',
            count: 2,
            rarity: 'common',
            effect: { type: 'heal', value: 25 },
            isFreeItem: true
        });

        console.log('[LoadoutUI] Basic loadout selected');
    },

    _adjustStartingFloor(delta) {
        const unlockedFloors = persistentState?.shortcuts?.unlockedFloors || [1];
        const currentIdx = unlockedFloors.indexOf(this.startingFloor);
        const newIdx = Math.max(0, Math.min(unlockedFloors.length - 1, currentIdx + delta));
        this.startingFloor = unlockedFloors[newIdx] || 1;
    },

    _startRun() {
        console.log(`[LoadoutUI] Starting run from floor ${this.startingFloor}`);

        // Withdraw items from bank that were selected
        const bankItems = persistentState?.bank?.items || [];
        const indicesToRemove = new Set();

        // Collect all bank indices used
        this.runInventory.forEach(item => {
            if (item.bankIndex !== undefined && !item.isFreeItem) {
                indicesToRemove.add(item.bankIndex);
            }
        });
        Object.values(this.runEquipment).forEach(item => {
            if (item && item.bankIndex !== undefined && !item.isFreeItem) {
                indicesToRemove.add(item.bankIndex);
            }
        });

        // Remove from bank (in reverse order to preserve indices)
        const sortedIndices = Array.from(indicesToRemove).sort((a, b) => b - a);
        sortedIndices.forEach(idx => {
            if (persistentState?.bank?.items) {
                persistentState.bank.items.splice(idx, 1);
            }
        });

        // Build loadout object for the run
        const loadout = {
            weapon: this.runEquipment.MAIN,
            armor: [
                this.runEquipment.HEAD,
                this.runEquipment.CHEST,
                this.runEquipment.LEGS,
                this.runEquipment.FEET
            ].filter(a => a !== null),
            offhand: this.runEquipment.OFF,
            consumables: this.runInventory.filter(i => i.type === 'consumable'),
            materials: this.runInventory.filter(i => i.type === 'material'),
            gold: this.runGold
        };

        this.active = false;

        // Start dungeon run
        if (typeof startDungeonRun === 'function') {
            startDungeonRun({
                startingFloor: this.startingFloor,
                loadout: loadout
            });
        } else {
            console.error('[LoadoutUI] startDungeonRun not found!');
            game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
        }
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    render(ctx) {
        if (!this.active) return;

        const canvas = ctx.canvas;

        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate panel position
        const panelX = (canvas.width - this.PANEL_WIDTH) / 2;
        const panelY = (canvas.height - this.PANEL_HEIGHT) / 2;

        // Draw main panel
        this._renderPanel(ctx, panelX, panelY);

        // Draw three columns
        this._renderBankPanel(ctx, panelX + 20, panelY + 60);
        this._renderEquipmentPanel(ctx, panelX + 320, panelY + 60);
        this._renderInventoryPanel(ctx, panelX + 620, panelY + 60);

        // Draw bottom action bar
        this._renderActionBar(ctx, panelX, panelY + this.PANEL_HEIGHT - 100);

        // Draw controls
        this._renderControls(ctx, panelX, panelY);
    },

    _renderPanel(ctx, x, y) {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x + 5, y + 5, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        // Background
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        // Border
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        // Title bar
        ctx.fillStyle = '#161b22';
        ctx.fillRect(x, y, this.PANEL_WIDTH, 50);

        // Title
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#58a6ff';
        ctx.fillText('EXPEDITION LOADOUT', x + this.PANEL_WIDTH / 2, y + 35);

        // Floor selector in title bar
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#8b949e';
        ctx.fillText(`Floor ${this.startingFloor}`, x + this.PANEL_WIDTH - 20, y + 30);
        ctx.font = '10px Arial';
        ctx.fillText('[PgUp/PgDn]', x + this.PANEL_WIDTH - 20, y + 44);
    },

    _renderBankPanel(ctx, x, y) {
        const width = 280;
        const height = 480;

        // Panel background
        ctx.fillStyle = this.currentPanel === 0 ? '#1c2128' : '#161b22';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = this.currentPanel === 0 ? '#58a6ff' : '#30363d';
        ctx.lineWidth = this.currentPanel === 0 ? 2 : 1;
        ctx.strokeRect(x, y, width, height);

        // Title
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8b949e';
        ctx.fillText('BANK / STASH', x + width / 2, y + 20);

        // Bank gold and item count
        const bankGold = persistentState?.bank?.gold || 0;
        const bankItems = this._getBankItems();
        ctx.font = '12px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`${bankGold}g | ${bankItems.length} items`, x + width / 2, y + 38);

        // Item grid with scroll support
        const gridX = x + 15;
        const gridY = y + 55;
        const maxVisibleRows = 6;

        this._renderScrollableGrid(ctx, gridX, gridY, bankItems, this.currentPanel === 0, this.bankScroll, maxVisibleRows);

        // Scroll indicator if needed
        const totalRows = Math.ceil(bankItems.length / this.GRID_COLS);
        if (totalRows > maxVisibleRows) {
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#58a6ff';
            ctx.fillText(`↑↓ ${this.bankScroll + 1}-${Math.min(this.bankScroll + maxVisibleRows, totalRows)}/${totalRows}`, x + width / 2, y + height - 160);
        }

        // Item description panel (below grid) - 140px tall panel
        if (this.currentPanel === 0 && bankItems.length > 0 && this.selectedIndex < bankItems.length) {
            this._renderItemDescription(ctx, x + 5, y + height - 150, width - 10, bankItems[this.selectedIndex].item);
        }
    },

    _renderEquipmentPanel(ctx, x, y) {
        const width = 280;
        const height = 480;

        // Panel background
        ctx.fillStyle = this.currentPanel === 1 ? '#1c2128' : '#161b22';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = this.currentPanel === 1 ? '#58a6ff' : '#30363d';
        ctx.lineWidth = this.currentPanel === 1 ? 2 : 1;
        ctx.strokeRect(x, y, width, height);

        // Title
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8b949e';
        ctx.fillText('EQUIPMENT', x + width / 2, y + 20);

        // Draw equipment slots in paper-doll layout
        const centerX = x + width / 2;
        const slotSize = 60;
        const gap = 10;

        // HEAD (top center)
        this._renderEquipSlot(ctx, centerX - slotSize/2, y + 50, slotSize,
            'HEAD', this.runEquipment.HEAD,
            this.currentPanel === 1 && this.equipmentSlotIndex === 0);

        // MAIN (left) and OFF (right)
        this._renderEquipSlot(ctx, centerX - slotSize - gap, y + 130, slotSize,
            'WEAPON', this.runEquipment.MAIN,
            this.currentPanel === 1 && this.equipmentSlotIndex === 1);
        this._renderEquipSlot(ctx, centerX + gap, y + 130, slotSize,
            'OFF', this.runEquipment.OFF,
            this.currentPanel === 1 && this.equipmentSlotIndex === 2);

        // CHEST (center, between weapon/off)
        this._renderEquipSlot(ctx, centerX - slotSize/2, y + 130, slotSize,
            'CHEST', this.runEquipment.CHEST,
            this.currentPanel === 1 && this.equipmentSlotIndex === 3);

        // LEGS (center below chest)
        this._renderEquipSlot(ctx, centerX - slotSize/2, y + 210, slotSize,
            'LEGS', this.runEquipment.LEGS,
            this.currentPanel === 1 && this.equipmentSlotIndex === 4);

        // FEET (bottom center)
        this._renderEquipSlot(ctx, centerX - slotSize/2, y + 290, slotSize,
            'FEET', this.runEquipment.FEET,
            this.currentPanel === 1 && this.equipmentSlotIndex === 5);

        // Stats summary
        this._renderStatsSummary(ctx, x + 10, y + 380, width - 20);
    },

    _renderEquipSlot(ctx, x, y, size, label, item, isSelected) {
        // Slot background
        ctx.fillStyle = item ? '#238636' : '#21262d';
        ctx.fillRect(x, y, size, size);

        // Selection highlight
        if (isSelected) {
            ctx.strokeStyle = '#58a6ff';
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 2, y - 2, size + 4, size + 4);
        } else {
            ctx.strokeStyle = '#30363d';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, size, size);
        }

        // Item or label
        ctx.textAlign = 'center';
        if (item) {
            // Item icon/name
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = this._getRarityColor(item.rarity);

            // Truncate name if too long
            const displayName = item.name.length > 10 ?
                item.name.substring(0, 9) + '..' : item.name;
            ctx.fillText(displayName, x + size/2, y + size/2 - 5);

            // Stats
            ctx.font = '9px Arial';
            ctx.fillStyle = '#8b949e';
            if (item.damage) {
                ctx.fillText(`DMG: ${item.damage}`, x + size/2, y + size/2 + 8);
            } else if (item.pDef) {
                ctx.fillText(`DEF: ${item.pDef}`, x + size/2, y + size/2 + 8);
            }
        } else {
            // Empty slot label
            ctx.font = '10px Arial';
            ctx.fillStyle = '#484f58';
            ctx.fillText(label, x + size/2, y + size/2 + 3);
        }
    },

    _renderStatsSummary(ctx, x, y, width) {
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#8b949e';
        ctx.fillText('STATS', x, y);

        let totalDamage = 0;
        let totalDef = 0;

        if (this.runEquipment.MAIN) {
            totalDamage += this.runEquipment.MAIN.damage || 0;
        }
        ['HEAD', 'CHEST', 'LEGS', 'FEET'].forEach(slot => {
            if (this.runEquipment[slot]) {
                totalDef += this.runEquipment[slot].pDef || 0;
            }
        });

        ctx.font = '11px Arial';
        ctx.fillStyle = '#e74c3c';
        ctx.fillText(`Damage: ${totalDamage}`, x, y + 18);
        ctx.fillStyle = '#3498db';
        ctx.fillText(`Defense: ${totalDef}`, x + 80, y + 18);

        // Item count
        ctx.fillStyle = '#8b949e';
        ctx.fillText(`Items: ${this.runInventory.length}/15`, x, y + 36);
    },

    _renderInventoryPanel(ctx, x, y) {
        const width = 450;
        const height = 480;

        // Panel background
        ctx.fillStyle = this.currentPanel === 2 ? '#1c2128' : '#161b22';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = this.currentPanel === 2 ? '#58a6ff' : '#30363d';
        ctx.lineWidth = this.currentPanel === 2 ? 2 : 1;
        ctx.strokeRect(x, y, width, height);

        // Title
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8b949e';
        ctx.fillText('RUN INVENTORY', x + width / 2, y + 20);

        ctx.font = '12px Arial';
        ctx.fillText(`${this.runInventory.length}/15 slots`, x + width / 2, y + 38);

        // Item grid with more columns
        const gridX = x + 15;
        const gridY = y + 55;
        const invItems = this.runInventory.map((item, idx) => ({ item, bankIndex: item.bankIndex }));

        this._renderItemGrid(ctx, gridX, gridY, invItems, this.currentPanel === 2, 6);
    },

    _renderItemGrid(ctx, x, y, items, isActive, cols = 4) {
        this._renderScrollableGrid(ctx, x, y, items, isActive, 0, 6, cols);
    },

    _renderScrollableGrid(ctx, x, y, items, isActive, scrollOffset = 0, maxVisibleRows = 6, cols = 4) {
        const slotSize = this.SLOT_SIZE;
        const gap = this.SLOT_GAP;
        const totalRows = Math.ceil(items.length / cols) || 1;

        // Draw grid slots with scroll offset
        for (let visibleRow = 0; visibleRow < maxVisibleRows; visibleRow++) {
            const actualRow = visibleRow + scrollOffset;
            for (let col = 0; col < cols; col++) {
                const idx = actualRow * cols + col;
                const slotX = x + col * (slotSize + gap);
                const slotY = y + visibleRow * (slotSize + gap);

                // Check if we have an item at this index
                const item = idx < items.length ? items[idx] : null;
                const isSelected = isActive && idx === this.selectedIndex;

                // Slot background
                ctx.fillStyle = item ? '#21262d' : '#161b22';
                ctx.fillRect(slotX, slotY, slotSize, slotSize);

                // Selection highlight
                if (isSelected) {
                    ctx.strokeStyle = '#58a6ff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(slotX - 1, slotY - 1, slotSize + 2, slotSize + 2);
                } else {
                    ctx.strokeStyle = '#30363d';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(slotX, slotY, slotSize, slotSize);
                }

                if (item) {
                    this._renderItemSlot(ctx, slotX, slotY, slotSize, item.item);
                }
            }
        }
    },

    _renderItemDescription(ctx, x, y, width, item) {
        if (!item) return;

        const height = 140;
        const colWidth = (width - 16) / 2;
        const leftCol = x + 8;
        const rightCol = x + 8 + colWidth;

        // Description panel background
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = this._getRarityColor(item.rarity);
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Item name with rarity color
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = this._getRarityColor(item.rarity);
        const displayName = item.name || 'Unknown Item';
        ctx.fillText(displayName, leftCol, y + 14);

        // Gold value (prominent, top right)
        const goldVal = item.goldValue || item.sellValue || 0;
        if (goldVal > 0) {
            ctx.textAlign = 'right';
            ctx.font = 'bold 11px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`💰 ${goldVal}g`, x + width - 8, y + 14);
        }

        // Item type line (rarity + type + subtype)
        ctx.textAlign = 'left';
        ctx.font = '9px Arial';
        ctx.fillStyle = '#8b949e';
        let typeStr = (item.rarity || 'common').charAt(0).toUpperCase() + (item.rarity || 'common').slice(1);
        if (item.weaponType) {
            typeStr += ` ${item.weaponType.charAt(0).toUpperCase() + item.weaponType.slice(1)}`;
        } else if (item.armorType) {
            typeStr += ` ${item.armorType.charAt(0).toUpperCase() + item.armorType.slice(1)} Armor`;
        } else if (item.type) {
            typeStr += ` ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`;
        }
        if (item.slot && item.slot !== 'MAIN') {
            typeStr += ` (${item.slot})`;
        }
        ctx.fillText(typeStr, leftCol, y + 26);

        // Damage type for weapons
        if (item.damageType) {
            ctx.fillStyle = '#7f8c8d';
            const dmgTypeStr = `${item.damageType.charAt(0).toUpperCase() + item.damageType.slice(1)} damage`;
            ctx.fillText(dmgTypeStr, leftCol + ctx.measureText(typeStr).width + 10, y + 26);
        }

        // Stats section - use item.stats object
        const stats = item.stats || {};
        ctx.font = '10px Arial';
        let leftY = y + 42;
        let rightY = y + 42;

        // LEFT COLUMN - Combat stats
        // Damage
        const damage = stats.damage || item.damage;
        if (damage) {
            ctx.fillStyle = '#e74c3c';
            ctx.fillText(`⚔ Damage: ${damage}`, leftCol, leftY);
            leftY += 13;
        }

        // Attack speed
        const speed = stats.speed || item.attackSpeed;
        if (speed) {
            ctx.fillStyle = '#f39c12';
            const speedLabel = speed >= 1.1 ? 'Fast' : speed <= 0.9 ? 'Slow' : 'Normal';
            ctx.fillText(`⚡ Speed: ${speed.toFixed(2)} (${speedLabel})`, leftCol, leftY);
            leftY += 13;
        }

        // Range
        const range = stats.range;
        if (range) {
            ctx.fillStyle = '#9b59b6';
            ctx.fillText(`📏 Range: ${range}`, leftCol, leftY);
            leftY += 13;
        }

        // Defense
        const defense = stats.defense || item.defense;
        if (defense) {
            ctx.fillStyle = '#3498db';
            ctx.fillText(`🛡 Defense: ${defense}`, leftCol, leftY);
            leftY += 13;
        }

        // Block chance (shields)
        const block = stats.block;
        if (block) {
            ctx.fillStyle = '#1abc9c';
            ctx.fillText(`🛡 Block: ${Math.round(block * 100)}%`, leftCol, leftY);
            leftY += 13;
        }

        // Physical/Magical Defense
        const pDef = stats.pDef || item.pDef;
        const mDef = stats.mDef || item.mDef;
        if (pDef) {
            ctx.fillStyle = '#3498db';
            ctx.fillText(`P.Def: +${pDef}`, leftCol, leftY);
            leftY += 13;
        }
        if (mDef) {
            ctx.fillStyle = '#9b59b6';
            ctx.fillText(`M.Def: +${mDef}`, leftCol, leftY);
            leftY += 13;
        }

        // RIGHT COLUMN - Stat bonuses and specials
        // Stat bonuses
        const str = stats.str || item.str;
        const agi = stats.agi || item.agi;
        const int = stats.int || item.int;

        if (str && str > 0) {
            ctx.fillStyle = '#e74c3c';
            ctx.fillText(`STR: +${str}`, rightCol, rightY);
            rightY += 13;
        }
        if (agi && agi > 0) {
            ctx.fillStyle = '#2ecc71';
            ctx.fillText(`AGI: +${agi}`, rightCol, rightY);
            rightY += 13;
        }
        if (int && int > 0) {
            ctx.fillStyle = '#3498db';
            ctx.fillText(`INT: +${int}`, rightCol, rightY);
            rightY += 13;
        }

        // Element
        if (item.element && item.element !== 'physical' && item.element !== null) {
            ctx.fillStyle = this._getElementColor(item.element);
            let elemStr = `✨ ${item.element.charAt(0).toUpperCase() + item.element.slice(1)}`;
            if (item.elementPower) {
                elemStr += ` (${item.elementPower})`;
            }
            ctx.fillText(elemStr, rightCol, rightY);
            rightY += 13;
        }

        // Special properties
        if (item.special) {
            ctx.fillStyle = '#f1c40f';
            for (const [key, value] of Object.entries(item.special)) {
                let specialText = '';
                if (key === 'critBonus') specialText = `+${Math.round(value * 100)}% Crit`;
                else if (key === 'critDmg') specialText = `+${Math.round(value * 100)}% Crit Dmg`;
                else if (key === 'executeBonus') specialText = `+${Math.round(value * 100)}% Execute`;
                else if (key === 'poisonChance') specialText = `${Math.round(value * 100)}% Poison`;
                else if (key === 'slowAmount') specialText = `${Math.round(value * 100)}% Slow`;
                else if (key === 'noiseReduction') specialText = `-${Math.round(value * 100)}% Noise`;
                else if (key === 'doubleStrike') specialText = `${Math.round(value * 100)}% Double Strike`;
                else if (key === 'dispel') specialText = 'Dispels magic';
                else if (key === 'lifeSteal') specialText = `${Math.round(value * 100)}% Life Steal`;
                else if (key === 'armorPen') specialText = `${Math.round(value * 100)}% Armor Pen`;
                else if (key === 'knockback') specialText = `Knockback: ${value}`;
                else specialText = `${key}: ${typeof value === 'number' ? Math.round(value * 100) + '%' : value}`;

                if (specialText) {
                    ctx.fillText(`★ ${specialText}`, rightCol, rightY);
                    rightY += 13;
                }
            }
        }

        // Effect (consumables)
        if (item.effect) {
            ctx.fillStyle = '#1abc9c';
            const effectText = `${item.effect.type}: ${item.effect.value || ''}`;
            ctx.fillText(effectText, rightCol, rightY);
            rightY += 13;
        }

        // Quantity (bottom left)
        if (item.count && item.count > 1) {
            ctx.fillStyle = '#95a5a6';
            ctx.fillText(`Qty: ${item.count}`, leftCol, y + height - 8);
        }

        // Noise level (bottom right) - stealth indicator
        const noise = item.noise;
        if (noise) {
            ctx.textAlign = 'right';
            ctx.fillStyle = '#7f8c8d';
            const noiseVal = noise.onAttack || noise.onMove || 0;
            const noiseLabel = noiseVal <= 30 ? 'Silent' : noiseVal <= 45 ? 'Quiet' : noiseVal <= 55 ? 'Normal' : 'Loud';
            ctx.fillText(`🔊 ${noiseLabel}`, x + width - 8, y + height - 8);
        }
    },

    _getElementColor(element) {
        const colors = {
            fire: '#ff6b35',
            ice: '#74b9ff',
            water: '#0984e3',
            earth: '#8b4513',
            nature: '#2ecc71',
            death: '#6c5ce7',
            holy: '#ffeaa7',
            dark: '#2d3436',
            arcane: '#a29bfe',
            physical: '#95a5a6'
        };
        return colors[element] || '#ffffff';
    },

    _renderItemSlot(ctx, x, y, size, item) {
        // Rarity border color
        const rarityColor = this._getRarityColor(item.rarity);
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

        // Type icon
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = rarityColor;

        let icon = '?';
        if (item.type === 'weapon') icon = '⚔';
        else if (item.type === 'armor') icon = '🛡';
        else if (item.type === 'consumable') icon = '✚';
        else if (item.type === 'material') icon = '◆';

        ctx.fillText(icon, x + size/2, y + size/2 + 5);

        // Stack count
        if (item.count && item.count > 1) {
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'right';
            ctx.fillStyle = '#FFF';
            ctx.fillText(`${item.count}`, x + size - 3, y + size - 3);
        }
    },

    _getRarityColor(rarity) {
        const colors = {
            common: '#9e9e9e',
            uncommon: '#2ecc71',
            rare: '#3498db',
            epic: '#9b59b6',
            legendary: '#FFD700'
        };
        return colors[rarity] || '#9e9e9e';
    },

    _renderActionBar(ctx, x, y) {
        const width = this.PANEL_WIDTH;
        const height = 80;

        // Background
        ctx.fillStyle = '#161b22';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);

        // Buttons
        const buttonY = y + 20;
        const buttonHeight = 40;

        // Basic Kit button
        ctx.fillStyle = '#238636';
        ctx.fillRect(x + 50, buttonY, 150, buttonHeight);
        ctx.strokeStyle = '#2ea043';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 50, buttonY, 150, buttonHeight);
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFF';
        ctx.fillText('[Q] BASIC KIT', x + 125, buttonY + 26);

        // Start Run button
        ctx.fillStyle = '#58a6ff';
        ctx.fillRect(x + width - 250, buttonY, 200, buttonHeight);
        ctx.strokeStyle = '#79c0ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + width - 250, buttonY, 200, buttonHeight);
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#FFF';
        ctx.fillText(`[R] START - Floor ${this.startingFloor}`, x + width - 150, buttonY + 27);

        // Value at risk
        let totalValue = 0;
        this.runInventory.forEach(item => {
            if (!item.isFreeItem) totalValue += item.sellValue || 10;
        });
        Object.values(this.runEquipment).forEach(item => {
            if (item && !item.isFreeItem) totalValue += item.sellValue || 20;
        });

        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = totalValue > 0 ? '#e74c3c' : '#8b949e';
        ctx.fillText(`Value at Risk: ${totalValue}g`, x + width / 2, buttonY + 50);
    },

    _renderControls(ctx, panelX, panelY) {
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8b949e';
        ctx.fillText(
            '[Arrows] Navigate | [E/Enter] Transfer/Equip | [Tab] Switch Panel | [Q] Basic Kit | [R] Start Run | [ESC] Close',
            panelX + this.PANEL_WIDTH / 2,
            panelY + this.PANEL_HEIGHT - 10
        );
    }
};

// ============================================================================
// KEYBOARD HOOK
// ============================================================================

window.addEventListener('keydown', (e) => {
    if (game.state === 'loadout' || game.state === GAME_STATES?.LOADOUT) {
        LoadoutUI.handleInput(e.key);
        e.preventDefault();
    }
});

// ============================================================================
// EXPORTS
// ============================================================================

window.LoadoutUI = LoadoutUI;

console.log('[LoadoutUI] Arc Raiders-style loadout UI loaded');
