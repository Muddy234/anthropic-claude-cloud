// === js/ui/shop-ui.js ===
// Village shop interface for NPCs

// ============================================================================
// SHOP UI
// ============================================================================

const ShopUI = {

    // State
    active: false,
    selectedIndex: 0,
    currentTab: 0,  // 0 = buy, 1 = sell
    focusArea: 'list',  // 'tabs', 'list', 'buttons'
    message: '',
    messageTimeout: null,

    // Layout
    PANEL_WIDTH: 800,
    PANEL_HEIGHT: 550,

    // Shop inventories for different NPCs
    INVENTORIES: {
        blacksmith_stock: [
            { name: 'Iron Sword', price: 50, type: 'weapon', damage: 8, description: 'A sturdy iron blade.' },
            { name: 'Steel Axe', price: 75, type: 'weapon', damage: 10, description: 'A heavy chopping axe.' },
            { name: 'Iron Helm', price: 40, type: 'armor', slot: 'HEAD', pDef: 3, description: 'Basic head protection.' },
            { name: 'Chainmail', price: 80, type: 'armor', slot: 'CHEST', pDef: 5, description: 'Linked metal rings.' },
            { name: 'Iron Boots', price: 35, type: 'armor', slot: 'FEET', pDef: 2, description: 'Sturdy footwear.' },
            { name: 'Repair Kit', price: 25, type: 'consumable', description: 'Repairs equipment durability.' }
        ],
        alchemist_stock: [
            { name: 'Health Potion', price: 30, type: 'consumable', description: 'Restores 50 HP.' },
            { name: 'Mana Potion', price: 25, type: 'consumable', description: 'Restores 30 MP.' },
            { name: 'Antidote', price: 20, type: 'consumable', description: 'Cures poison.' },
            { name: 'Fire Bomb', price: 45, type: 'consumable', description: 'Deals fire damage in an area.' },
            { name: 'Smoke Bomb', price: 35, type: 'consumable', description: 'Creates a smoke screen for escape.' }
        ],
        innkeeper_stock: [
            { name: 'Bread', price: 5, type: 'consumable', description: 'Restores 10 HP.' },
            { name: 'Ale', price: 8, type: 'consumable', description: 'Increases courage (and blur).' },
            { name: 'Trail Rations', price: 15, type: 'consumable', description: 'Restores 25 HP over time.' }
        ]
    },

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Open the shop UI
     * @param {Object} npc - The NPC running this shop
     */
    open(npc) {
        this.active = true;
        this.currentNPC = npc;
        this.selectedIndex = 0;
        this.currentTab = 0;
        this.focusArea = 'list';
        this.message = '';

        // Get inventory for this NPC
        const inventoryKey = npc?.inventory || 'blacksmith_stock';
        this.items = this.INVENTORIES[inventoryKey] || this.INVENTORIES.blacksmith_stock;

        // Validate items have valid prices
        this.items = this.items.filter(item => this._validateItem(item));

        game.state = GAME_STATES ? GAME_STATES.SHOP : 'shop';
        console.log(`[ShopUI] Opened shop for ${npc?.name || 'Unknown'}`);
    },

    /**
     * Validate an item has proper price data
     * Issue #10: Enhanced validation to prevent exploits
     * @param {Object} item - Item to validate
     * @returns {boolean} - True if item is valid
     */
    _validateItem(item) {
        if (!item) return false;

        // Validate name
        if (!item.name || typeof item.name !== 'string') {
            console.warn('[ShopUI] Item missing or invalid name');
            return false;
        }

        // Validate price exists and is a positive number
        if (typeof item.price !== 'number') {
            console.warn(`[ShopUI] Invalid price type for item: ${item.name} (${typeof item.price})`);
            return false;
        }

        // Check for negative or zero prices
        if (item.price <= 0) {
            console.warn(`[ShopUI] Invalid price for item: ${item.name} (${item.price})`);
            return false;
        }

        // Check for non-integer prices (could cause floating point issues)
        if (!Number.isInteger(item.price)) {
            console.warn(`[ShopUI] Non-integer price for item: ${item.name} - rounding to ${Math.floor(item.price)}`);
            item.price = Math.floor(item.price);
        }

        // Check for unreasonably high prices (could be overflow exploit)
        const MAX_PRICE = 999999999;
        if (item.price > MAX_PRICE) {
            console.warn(`[ShopUI] Price too high for item: ${item.name} (${item.price})`);
            return false;
        }

        // Check for NaN or Infinity
        if (!Number.isFinite(item.price)) {
            console.warn(`[ShopUI] Invalid price (NaN/Infinity) for item: ${item.name}`);
            return false;
        }

        return true;
    },

    /**
     * Validate a transaction is safe to perform
     * Issue #10: Comprehensive transaction validation
     * @param {string} type - 'buy' or 'sell'
     * @param {Object} item - Item being transacted
     * @param {number} price - Transaction price
     * @returns {Object} - {valid: boolean, error: string}
     */
    _validateTransaction(type, item, price) {
        if (!item) {
            return { valid: false, error: 'Invalid item' };
        }

        if (!Number.isFinite(price) || price <= 0) {
            return { valid: false, error: 'Invalid price' };
        }

        const playerGold = persistentState?.bank?.gold || 0;

        if (type === 'buy') {
            // Check player can afford
            if (playerGold < price) {
                return { valid: false, error: `Not enough gold! Need ${price}g, have ${playerGold}g` };
            }

            // Check for overflow after purchase (would result in negative gold)
            const newGold = playerGold - price;
            if (newGold < 0) {
                return { valid: false, error: 'Transaction would result in negative gold' };
            }
        } else if (type === 'sell') {
            // Check item can be sold
            if (item.noSell) {
                return { valid: false, error: 'This item cannot be sold' };
            }

            // Check for overflow when adding gold
            const newGold = playerGold + price;
            const MAX_GOLD = 999999999;
            if (newGold > MAX_GOLD) {
                return { valid: false, error: `Cannot exceed max gold (${MAX_GOLD}g)` };
            }
        }

        return { valid: true, error: null };
    },

    /**
     * Close the shop UI
     */
    close() {
        this.active = false;
        this.currentNPC = null;
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
            this.messageTimeout = null;
        }
        game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
        console.log('[ShopUI] Closed');
    },

    // ========================================================================
    // INPUT HANDLING
    // ========================================================================

    /**
     * Handle keyboard input
     * @param {string} key
     * @param {boolean} shiftKey - Whether shift is held
     */
    handleInput(key, shiftKey = false) {
        if (!this.active) return;

        const maxIndex = this.currentTab === 0
            ? this.items.length - 1
            : (game.player?.inventory?.length || 1) - 1;

        // Escape always closes
        if (key === 'Escape') {
            this.close();
            return;
        }

        // Tab cycling through focus areas
        if (key === 'Tab') {
            if (shiftKey) {
                // Shift+Tab goes backwards
                if (this.focusArea === 'buttons') {
                    this.focusArea = 'list';
                } else if (this.focusArea === 'list') {
                    this.focusArea = 'tabs';
                } else {
                    this.focusArea = 'buttons';
                }
            } else {
                // Tab goes forward
                if (this.focusArea === 'tabs') {
                    this.focusArea = 'list';
                } else if (this.focusArea === 'list') {
                    this.focusArea = 'buttons';
                } else {
                    this.focusArea = 'tabs';
                }
            }
            return;
        }

        // Handle input based on focus area
        switch (this.focusArea) {
            case 'tabs':
                this._handleTabsInput(key);
                break;
            case 'list':
                this._handleListInput(key, maxIndex);
                break;
            case 'buttons':
                this._handleButtonsInput(key);
                break;
        }
    },

    /**
     * Handle input when tabs are focused
     */
    _handleTabsInput(key) {
        switch (key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (this.currentTab > 0) {
                    this.currentTab = 0;
                    this.selectedIndex = 0;
                }
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (this.currentTab < 1) {
                    this.currentTab = 1;
                    this.selectedIndex = 0;
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.focusArea = 'list';
                break;
            case 'Enter':
            case ' ':
                this.focusArea = 'list';
                break;
        }
    },

    /**
     * Handle input when item list is focused
     */
    _handleListInput(key, maxIndex) {
        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (this.selectedIndex > 0) {
                    this.selectedIndex--;
                } else {
                    // Move to tabs when at top
                    this.focusArea = 'tabs';
                }
                break;

            case 'ArrowDown':
            case 's':
            case 'S':
                if (this.selectedIndex < maxIndex) {
                    this.selectedIndex++;
                } else {
                    // Move to buttons when at bottom
                    this.focusArea = 'buttons';
                }
                break;

            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.currentTab = 0;
                this.selectedIndex = 0;
                break;

            case 'ArrowRight':
            case 'd':
            case 'D':
                this.currentTab = 1;
                this.selectedIndex = 0;
                break;

            case 'Enter':
            case 'e':
            case 'E':
            case ' ':
                if (this.currentTab === 0) {
                    this._buyItem();
                } else {
                    this._sellItem();
                }
                break;

            default:
                // Number keys 1-9 for quick selection
                const numKey = parseInt(key);
                if (numKey >= 1 && numKey <= 9) {
                    const targetIndex = numKey - 1;
                    if (targetIndex <= maxIndex) {
                        this.selectedIndex = targetIndex;
                        // Also execute the buy/sell
                        if (this.currentTab === 0) {
                            this._buyItem();
                        } else {
                            this._sellItem();
                        }
                    }
                }
                break;
        }
    },

    /**
     * Handle input when buttons are focused
     */
    _handleButtonsInput(key) {
        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.focusArea = 'list';
                break;
            case 'Enter':
            case ' ':
                // Close button action
                this.close();
                break;
        }
    },

    /**
     * Buy the selected item
     * Issue #10: Uses comprehensive transaction validation
     * @private
     */
    _buyItem() {
        if (this.selectedIndex < 0 || this.selectedIndex >= this.items.length) {
            this._showMessage('No item selected!', 'error');
            return;
        }

        const item = this.items[this.selectedIndex];

        // Validate item
        if (!this._validateItem(item)) {
            this._showMessage('Invalid item!', 'error');
            return;
        }

        // Validate transaction
        const validation = this._validateTransaction('buy', item, item.price);
        if (!validation.valid) {
            this._showMessage(validation.error, 'error');
            return;
        }

        // Perform transaction
        const price = item.price;

        // Deduct gold from bank
        if (persistentState?.bank) {
            persistentState.bank.gold = Math.max(0, (persistentState.bank.gold || 0) - price);
        }

        // Add to player inventory or bank
        const newItem = { ...item };
        delete newItem.price;  // Remove price from owned item

        if (game.player?.inventory) {
            game.player.inventory.push(newItem);
        } else if (persistentState?.bank?.items) {
            persistentState.bank.items.push(newItem);
        }

        this._showMessage(`Bought ${item.name} for ${price}g!`, 'success');
        console.log(`[ShopUI] Purchased ${item.name} for ${price}g`);

        // Auto-save after purchase
        if (typeof SaveManager !== 'undefined') SaveManager.save();
    },

    /**
     * Sell the selected item
     * Issue #10: Uses comprehensive transaction validation
     * @private
     */
    _sellItem() {
        const inventory = game.player?.inventory || [];

        if (this.selectedIndex < 0 || this.selectedIndex >= inventory.length) {
            this._showMessage('No item selected!', 'error');
            return;
        }

        const item = inventory[this.selectedIndex];

        // Validate item exists
        if (!item) {
            this._showMessage('Invalid item!', 'error');
            return;
        }

        // Calculate sell price (50% of buy price, minimum 1)
        const basePrice = item.price || 10;
        const sellPrice = Math.max(1, Math.floor(basePrice * 0.5));

        // Validate transaction
        const validation = this._validateTransaction('sell', item, sellPrice);
        if (!validation.valid) {
            this._showMessage(validation.error, 'error');
            return;
        }

        // Perform transaction
        const MAX_GOLD = 999999999;
        if (persistentState?.bank) {
            persistentState.bank.gold = Math.min(MAX_GOLD, (persistentState.bank.gold || 0) + sellPrice);
        }

        // Remove from inventory
        inventory.splice(this.selectedIndex, 1);

        // Adjust selection
        if (this.selectedIndex >= inventory.length) {
            this.selectedIndex = Math.max(0, inventory.length - 1);
        }

        this._showMessage(`Sold ${item.name} for ${sellPrice}g!`, 'success');
        console.log(`[ShopUI] Sold ${item.name} for ${sellPrice}g`);

        // Auto-save after sale
        if (typeof SaveManager !== 'undefined') SaveManager.save();
    },

    /**
     * Show a message to the player
     * @param {string} text - Message text
     * @param {string} type - 'success' or 'error'
     */
    _showMessage(text, type = 'success') {
        this.message = text;
        this.messageType = type;

        // Clear any existing timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        // Auto-clear message after 2 seconds
        this.messageTimeout = setTimeout(() => {
            this.message = '';
            this.messageType = '';
        }, 2000);
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render the shop UI
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.active) return;

        const canvas = ctx.canvas;

        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate panel position
        const panelX = (canvas.width - this.PANEL_WIDTH) / 2;
        const panelY = (canvas.height - this.PANEL_HEIGHT) / 2;

        // Draw panel
        this._renderPanel(ctx, panelX, panelY);

        // Draw tabs
        this._renderTabs(ctx, panelX, panelY);

        // Draw items list
        if (this.currentTab === 0) {
            this._renderBuyList(ctx, panelX, panelY);
        } else {
            this._renderSellList(ctx, panelX, panelY);
        }

        // Draw player gold
        this._renderGold(ctx, panelX, panelY);

        // Draw message
        if (this.message) {
            this._renderMessage(ctx, panelX, panelY);
        }

        // Draw close button
        this._renderCloseButton(ctx, panelX, panelY);

        // Draw controls
        this._renderControls(ctx, panelX, panelY);
    },

    /**
     * Render panel background - CotDG Merchant Counter Style
     * @private
     */
    _renderPanel(ctx, x, y) {
        // Get design system colors
        const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};
        const frameGold = colors.frameGold || '#b8860b';
        const frameGoldBright = colors.frameGoldBright || '#daa520';
        const frameGoldDark = colors.frameGoldDark || '#8b6914';
        const templeStone = colors.templeStone || '#2a2622';
        const templeStoneDark = colors.templeStoneDark || '#1a1816';

        ctx.save();

        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 5;

        // Main background with wood/stone texture gradient
        const bgGrad = ctx.createLinearGradient(x, y, x, y + this.PANEL_HEIGHT);
        bgGrad.addColorStop(0, '#2a2420');
        bgGrad.addColorStop(0.15, templeStone);
        bgGrad.addColorStop(0.85, templeStoneDark);
        bgGrad.addColorStop(1, '#0d0b0a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Wood grain texture overlay
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.1)';
        ctx.lineWidth = 1;
        for (let ty = y; ty < y + this.PANEL_HEIGHT; ty += 8) {
            ctx.beginPath();
            ctx.moveTo(x, ty + Math.sin(ty * 0.1) * 2);
            ctx.lineTo(x + this.PANEL_WIDTH, ty + Math.sin(ty * 0.1 + 1) * 2);
            ctx.stroke();
        }

        // Use design system temple frame if available
        if (typeof drawTempleFrame === 'function') {
            drawTempleFrame(ctx, x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT, {
                cornerSize: 20, borderWidth: 4, pattern: true
            });
        } else {
            // Fallback gold border frame
            const frameGrad = ctx.createLinearGradient(x, y, x + this.PANEL_WIDTH, y + this.PANEL_HEIGHT);
            frameGrad.addColorStop(0, frameGoldBright);
            frameGrad.addColorStop(0.3, frameGold);
            frameGrad.addColorStop(0.7, frameGoldDark);
            frameGrad.addColorStop(1, frameGold);
            ctx.strokeStyle = frameGrad;
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);
        }

        // Add ornate corners if available
        if (typeof drawOrnateCorners === 'function') {
            drawOrnateCorners(ctx, x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT, { size: 18 });
        }

        // Title bar background (counter surface)
        ctx.fillStyle = '#352f28';
        ctx.fillRect(x + 4, y + 4, this.PANEL_WIDTH - 8, 50);

        // Title with ornate divider
        const npcName = this.currentNPC?.name || 'Merchant';
        ctx.font = 'bold 22px serif';
        ctx.textAlign = 'center';

        // Title shadow
        ctx.fillStyle = frameGoldDark;
        ctx.fillText(`${npcName}'s Wares`, x + this.PANEL_WIDTH / 2 + 1, y + 36);
        // Title main
        ctx.fillStyle = frameGoldBright;
        ctx.fillText(`${npcName}'s Wares`, x + this.PANEL_WIDTH / 2, y + 35);

        // Ornate divider below title
        if (typeof drawOrnateDivider === 'function') {
            drawOrnateDivider(ctx, x + 20, y + 48, this.PANEL_WIDTH - 40, { emblem: true });
        } else {
            ctx.strokeStyle = frameGold;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 30, y + 52);
            ctx.lineTo(x + this.PANEL_WIDTH - 30, y + 52);
            ctx.stroke();
            // Center emblem
            ctx.fillStyle = frameGold;
            ctx.beginPath();
            ctx.arc(x + this.PANEL_WIDTH / 2, y + 52, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    /**
     * Render buy/sell tabs
     * @private
     */
    _renderTabs(ctx, panelX, panelY) {
        const tabWidth = 100;
        const tabHeight = 30;
        const tabY = panelY + 50;
        const tabsFocused = this.focusArea === 'tabs';

        ['BUY', 'SELL'].forEach((label, index) => {
            const tabX = panelX + 20 + index * (tabWidth + 10);
            const isSelected = index === this.currentTab;
            const isFocused = tabsFocused && isSelected;

            // Tab background
            ctx.fillStyle = isSelected ? '#FF6347' : '#2a2a4e';
            ctx.fillRect(tabX, tabY, tabWidth, tabHeight);

            // Tab border - white when focused
            ctx.strokeStyle = isFocused ? '#FFF' : (isSelected ? '#FFA07A' : '#4a4a6a');
            ctx.lineWidth = isFocused ? 2 : 1;
            ctx.strokeRect(tabX, tabY, tabWidth, tabHeight);

            // Tab text
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = isSelected ? '#FFF' : '#888';
            ctx.fillText(label, tabX + tabWidth / 2, tabY + 20);
        });
    },

    /**
     * Render buy list
     * @private
     */
    _renderBuyList(ctx, panelX, panelY) {
        const listX = panelX + 20;
        const listY = panelY + 100;
        const listWidth = this.PANEL_WIDTH - 40;
        const itemHeight = 50;
        const listFocused = this.focusArea === 'list';

        // List background with focus indicator
        ctx.fillStyle = '#12121a';
        ctx.fillRect(listX, listY, listWidth, 350);

        if (listFocused) {
            ctx.strokeStyle = '#FF6347';
            ctx.lineWidth = 2;
            ctx.strokeRect(listX, listY, listWidth, 350);
        }

        if (this.items.length === 0) {
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#666';
            ctx.fillText('No items for sale', listX + listWidth / 2, listY + 100);
            return;
        }

        const maxVisible = Math.floor(350 / itemHeight);
        const startIdx = Math.max(0, this.selectedIndex - Math.floor(maxVisible / 2));
        const visibleItems = this.items.slice(startIdx, startIdx + maxVisible);
        const playerGold = persistentState?.bank?.gold || 0;

        visibleItems.forEach((item, idx) => {
            const realIndex = startIdx + idx;
            const itemY = listY + 5 + idx * itemHeight;
            const isSelected = realIndex === this.selectedIndex && listFocused;
            const canAfford = playerGold >= item.price;

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = canAfford ? '#3a5a3e' : '#5a3a3e';
                ctx.fillRect(listX + 5, itemY, listWidth - 10, itemHeight - 5);

                // Selection border
                ctx.strokeStyle = canAfford ? '#4a8a4e' : '#8a4a4e';
                ctx.lineWidth = 2;
                ctx.strokeRect(listX + 5, itemY, listWidth - 10, itemHeight - 5);
            }

            // Item number (for quick buy)
            if (realIndex < 9) {
                ctx.font = '12px Arial';
                ctx.textAlign = 'left';
                ctx.fillStyle = '#666';
                ctx.fillText(`[${realIndex + 1}]`, listX + 10, itemY + 22);
            }

            // Item name
            ctx.font = isSelected ? 'bold 16px Arial' : '16px Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = canAfford ? this._getItemColor(item.type) : '#666';
            ctx.fillText(item.name, listX + 40, itemY + 22);

            // Description
            ctx.font = '12px Arial';
            ctx.fillStyle = '#888';
            ctx.fillText(item.description || '', listX + 40, itemY + 40);

            // Price
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'right';
            ctx.fillStyle = canAfford ? '#FFD700' : '#AA5555';
            ctx.fillText(`${item.price}g`, listX + listWidth - 15, itemY + 25);

            // Affordability indicator
            if (!canAfford && isSelected) {
                ctx.fillStyle = '#AA5555';
                ctx.font = '10px Arial';
                ctx.fillText('(insufficient)', listX + listWidth - 15, itemY + 40);
            }
        });

        // Scroll indicators
        if (startIdx > 0) {
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.font = '12px Arial';
            ctx.fillText(String.fromCharCode(9650) + ' more items above', listX + listWidth / 2, listY + 15);
        }
        if (startIdx + maxVisible < this.items.length) {
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.font = '12px Arial';
            ctx.fillText(String.fromCharCode(9660) + ' more items below', listX + listWidth / 2, listY + 340);
        }
    },

    /**
     * Render sell list
     * @private
     */
    _renderSellList(ctx, panelX, panelY) {
        const listX = panelX + 20;
        const listY = panelY + 100;
        const listWidth = this.PANEL_WIDTH - 40;
        const itemHeight = 50;
        const listFocused = this.focusArea === 'list';

        // List background with focus indicator
        ctx.fillStyle = '#12121a';
        ctx.fillRect(listX, listY, listWidth, 350);

        if (listFocused) {
            ctx.strokeStyle = '#FF6347';
            ctx.lineWidth = 2;
            ctx.strokeRect(listX, listY, listWidth, 350);
        }

        const inventory = game.player?.inventory || [];

        if (inventory.length === 0) {
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#666';
            ctx.fillText('No items to sell', listX + listWidth / 2, listY + 100);
            return;
        }

        const maxVisible = Math.floor(350 / itemHeight);
        const startIdx = Math.max(0, this.selectedIndex - Math.floor(maxVisible / 2));
        const visibleItems = inventory.slice(startIdx, startIdx + maxVisible);

        visibleItems.forEach((item, idx) => {
            const realIndex = startIdx + idx;
            const itemY = listY + 5 + idx * itemHeight;
            const isSelected = realIndex === this.selectedIndex && listFocused;
            const sellPrice = Math.max(1, Math.floor((item.price || 10) * 0.5));
            const canSell = !item.noSell;

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = canSell ? '#3a5a3e' : '#5a3a3e';
                ctx.fillRect(listX + 5, itemY, listWidth - 10, itemHeight - 5);

                // Selection border
                ctx.strokeStyle = canSell ? '#4a8a4e' : '#8a4a4e';
                ctx.lineWidth = 2;
                ctx.strokeRect(listX + 5, itemY, listWidth - 10, itemHeight - 5);
            }

            // Item number (for quick sell)
            if (realIndex < 9) {
                ctx.font = '12px Arial';
                ctx.textAlign = 'left';
                ctx.fillStyle = '#666';
                ctx.fillText(`[${realIndex + 1}]`, listX + 10, itemY + 22);
            }

            // Item name
            ctx.font = isSelected ? 'bold 16px Arial' : '16px Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = canSell ? this._getItemColor(item.type) : '#666';
            ctx.fillText(item.name, listX + 40, itemY + 22);

            // Type
            ctx.font = '12px Arial';
            ctx.fillStyle = '#888';
            ctx.fillText(item.type || 'misc', listX + 40, itemY + 40);

            // Sell price
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'right';
            ctx.fillStyle = canSell ? '#FFD700' : '#AA5555';
            ctx.fillText(canSell ? `${sellPrice}g` : 'No sell', listX + listWidth - 15, itemY + 25);
        });

        // Scroll indicators
        if (startIdx > 0) {
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.font = '12px Arial';
            ctx.fillText(String.fromCharCode(9650) + ' more items above', listX + listWidth / 2, listY + 15);
        }
        if (startIdx + maxVisible < inventory.length) {
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.font = '12px Arial';
            ctx.fillText(String.fromCharCode(9660) + ' more items below', listX + listWidth / 2, listY + 340);
        }
    },

    /**
     * Get color for item type
     * @private
     */
    _getItemColor(type) {
        switch (type) {
            case 'weapon': return '#e74c3c';
            case 'armor': return '#3498db';
            case 'consumable': return '#2ecc71';
            default: return '#FFFFFF';
        }
    },

    /**
     * Render player gold
     * @private
     */
    _renderGold(ctx, panelX, panelY) {
        const goldY = panelY + 470;
        const gold = persistentState?.bank?.gold || 0;

        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`Your Gold: ${gold}g`, panelX + 20, goldY);
    },

    /**
     * Render message
     * @private
     */
    _renderMessage(ctx, panelX, panelY) {
        const msgY = panelY + 470;

        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.messageType === 'error' ? '#e74c3c' : '#2ecc71';
        ctx.fillText(this.message, panelX + this.PANEL_WIDTH / 2, msgY);
    },

    /**
     * Render close button
     * @private
     */
    _renderCloseButton(ctx, panelX, panelY) {
        const btnX = panelX + this.PANEL_WIDTH - 120;
        const btnY = panelY + 460;
        const btnW = 100;
        const btnH = 35;
        const isFocused = this.focusArea === 'buttons';

        // Button background
        ctx.fillStyle = isFocused ? '#ff6b6b' : '#e74c3c';
        ctx.fillRect(btnX, btnY, btnW, btnH);

        // Button border
        if (isFocused) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(btnX, btnY, btnW, btnH);
        }

        // Button text
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText('CLOSE', btnX + btnW / 2, btnY + 23);
    },

    /**
     * Render controls
     * @private
     */
    _renderControls(ctx, panelX, panelY) {
        const controlsY = panelY + this.PANEL_HEIGHT - 25;

        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#888';

        ctx.fillText(
            String.fromCharCode(8593) + String.fromCharCode(8595) + ' Navigate | ' +
            String.fromCharCode(8592) + String.fromCharCode(8594) + ' Switch Tab | ' +
            '[1-9] Quick Buy/Sell | [Enter] Confirm | [Tab] Focus | [ESC] Close',
            panelX + this.PANEL_WIDTH / 2,
            controlsY
        );
    }
};

// ============================================================================
// KEYBOARD HOOK
// ============================================================================

window.addEventListener('keydown', (e) => {
    if (game.state === 'shop' || game.state === GAME_STATES?.SHOP) {
        // Prevent default for Tab to avoid losing focus
        if (e.key === 'Tab') {
            e.preventDefault();
        }
        ShopUI.handleInput(e.key, e.shiftKey);
    }
});

// ============================================================================
// EXPORTS
// ============================================================================

window.ShopUI = ShopUI;

console.log('[ShopUI] Shop UI loaded (with keyboard navigation)');
