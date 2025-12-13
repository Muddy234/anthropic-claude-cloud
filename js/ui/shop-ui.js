// === js/ui/shop-ui.js ===
// SURVIVAL EXTRACTION UPDATE: Village shop interface for NPCs

// ============================================================================
// SHOP UI
// ============================================================================

const ShopUI = {

    // State
    active: false,
    selectedIndex: 0,
    currentTab: 0,  // 0 = buy, 1 = sell

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
        this.message = '';

        // Get inventory for this NPC
        const inventoryKey = npc?.inventory || 'blacksmith_stock';
        this.items = this.INVENTORIES[inventoryKey] || this.INVENTORIES.blacksmith_stock;

        game.state = GAME_STATES ? GAME_STATES.SHOP : 'shop';
        console.log(`[ShopUI] Opened shop for ${npc?.name || 'Unknown'}`);
    },

    /**
     * Close the shop UI
     */
    close() {
        this.active = false;
        this.currentNPC = null;
        game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
        console.log('[ShopUI] Closed');
    },

    // ========================================================================
    // INPUT HANDLING
    // ========================================================================

    /**
     * Handle keyboard input
     * @param {string} key
     */
    handleInput(key) {
        if (!this.active) return;

        const maxIndex = this.currentTab === 0
            ? this.items.length - 1
            : (game.player?.inventory?.length || 1) - 1;

        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                break;

            case 'ArrowDown':
            case 's':
            case 'S':
                this.selectedIndex = Math.min(maxIndex, this.selectedIndex + 1);
                break;

            case 'ArrowLeft':
            case 'a':
            case 'A':
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.currentTab = this.currentTab === 0 ? 1 : 0;
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

            case 'Escape':
                this.close();
                break;
        }
    },

    /**
     * Buy the selected item
     * @private
     */
    _buyItem() {
        if (this.selectedIndex >= this.items.length) return;

        const item = this.items[this.selectedIndex];
        const playerGold = persistentState?.bank?.gold || 0;

        if (playerGold < item.price) {
            this.message = 'Not enough gold!';
            return;
        }

        // Deduct gold from bank
        if (persistentState?.bank) {
            persistentState.bank.gold -= item.price;
        }

        // Add to player inventory or bank
        const newItem = { ...item };
        delete newItem.price;  // Remove price from owned item

        if (game.player?.inventory) {
            game.player.inventory.push(newItem);
        } else if (persistentState?.bank?.items) {
            persistentState.bank.items.push(newItem);
        }

        this.message = `Bought ${item.name}!`;
        console.log(`[ShopUI] Purchased ${item.name} for ${item.price}g`);
    },

    /**
     * Sell the selected item
     * @private
     */
    _sellItem() {
        const inventory = game.player?.inventory || [];
        if (this.selectedIndex >= inventory.length) return;

        const item = inventory[this.selectedIndex];
        const sellPrice = Math.floor((item.price || 10) * 0.5);  // 50% of buy price

        // Add gold to bank
        if (persistentState?.bank) {
            persistentState.bank.gold += sellPrice;
        }

        // Remove from inventory
        inventory.splice(this.selectedIndex, 1);

        // Adjust selection
        if (this.selectedIndex >= inventory.length) {
            this.selectedIndex = Math.max(0, inventory.length - 1);
        }

        this.message = `Sold for ${sellPrice}g!`;
        console.log(`[ShopUI] Sold ${item.name} for ${sellPrice}g`);
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

        // Draw controls
        this._renderControls(ctx, panelX, panelY);
    },

    /**
     * Render panel background
     * @private
     */
    _renderPanel(ctx, x, y) {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x + 5, y + 5, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        // Border
        ctx.strokeStyle = '#FF6347';  // Tormund's color
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        // Title
        const npcName = this.currentNPC?.name || 'Shop';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FF6347';
        ctx.fillText(`${npcName}'s Wares`, x + this.PANEL_WIDTH / 2, y + 35);
    },

    /**
     * Render buy/sell tabs
     * @private
     */
    _renderTabs(ctx, panelX, panelY) {
        const tabWidth = 100;
        const tabHeight = 30;
        const tabY = panelY + 50;

        ['BUY', 'SELL'].forEach((label, index) => {
            const tabX = panelX + 20 + index * (tabWidth + 10);
            const isSelected = index === this.currentTab;

            ctx.fillStyle = isSelected ? '#FF6347' : '#2a2a4e';
            ctx.fillRect(tabX, tabY, tabWidth, tabHeight);

            ctx.strokeStyle = isSelected ? '#FFF' : '#4a4a6a';
            ctx.lineWidth = 2;
            ctx.strokeRect(tabX, tabY, tabWidth, tabHeight);

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

        ctx.fillStyle = '#12121a';
        ctx.fillRect(listX, listY, listWidth, 350);

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

        visibleItems.forEach((item, idx) => {
            const realIndex = startIdx + idx;
            const itemY = listY + 5 + idx * itemHeight;
            const isSelected = realIndex === this.selectedIndex;

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = '#3a3a5e';
                ctx.fillRect(listX + 5, itemY, listWidth - 10, itemHeight - 5);
            }

            // Item name
            ctx.font = isSelected ? 'bold 16px Arial' : '16px Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = this._getItemColor(item.type);
            ctx.fillText(item.name, listX + 15, itemY + 22);

            // Description
            ctx.font = '12px Arial';
            ctx.fillStyle = '#888';
            ctx.fillText(item.description || '', listX + 15, itemY + 40);

            // Price
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'right';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`${item.price}g`, listX + listWidth - 15, itemY + 25);
        });
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

        ctx.fillStyle = '#12121a';
        ctx.fillRect(listX, listY, listWidth, 350);

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
            const isSelected = realIndex === this.selectedIndex;
            const sellPrice = Math.floor((item.price || 10) * 0.5);

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = '#3a3a5e';
                ctx.fillRect(listX + 5, itemY, listWidth - 10, itemHeight - 5);
            }

            // Item name
            ctx.font = isSelected ? 'bold 16px Arial' : '16px Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = this._getItemColor(item.type);
            ctx.fillText(item.name, listX + 15, itemY + 22);

            // Type
            ctx.font = '12px Arial';
            ctx.fillStyle = '#888';
            ctx.fillText(item.type || 'misc', listX + 15, itemY + 40);

            // Sell price
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'right';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`${sellPrice}g`, listX + listWidth - 15, itemY + 25);
        });
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
        ctx.fillStyle = this.message.includes('Not enough') ? '#e74c3c' : '#2ecc71';
        ctx.fillText(this.message, panelX + this.PANEL_WIDTH / 2, msgY);

        // Clear message after a few seconds
        setTimeout(() => { this.message = ''; }, 2000);
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
            '[Arrows] Navigate | [A/D] Switch Tab | [E/Enter] Buy/Sell | [ESC] Close',
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
        ShopUI.handleInput(e.key);
    }
});

// ============================================================================
// EXPORTS
// ============================================================================

window.ShopUI = ShopUI;

console.log('[ShopUI] Shop UI loaded');
