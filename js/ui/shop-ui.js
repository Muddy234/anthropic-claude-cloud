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
    // ECONOMY UPDATE: Vendors sell raw materials, utilities, and basic supplies
    // Weapons/armor are NOT sold - they must be found in the dungeon
    INVENTORIES: {
        // ========================================================================
        // BLACKSMITH (Tormund) - Raw metals, smithing supplies
        // ========================================================================
        blacksmith_stock: [
            // Raw Materials
            { id: 'iron_ore', name: 'Iron Ore', price: 15, type: 'raw_material', category: 'metal',
              description: 'Raw iron ore for metal crafting and upgrades.' },
            // Utility Materials
            { id: 'coal', name: 'Coal', price: 5, type: 'utility_material',
              description: 'Fuel for metalworking. Essential for smithing.' },
            // Basic Supplies
            { id: 'whetstone', name: 'Whetstone', price: 10, type: 'basic_supply',
              description: 'Keeps blades sharp. Minor damage boost for one run.' },
            { id: 'repair_kit', name: 'Repair Kit', price: 20, type: 'basic_supply',
              description: 'Repairs minor equipment damage.' }
        ],

        // ========================================================================
        // ALCHEMIST (Zephyr) - Herbs, vials, alchemical supplies
        // ========================================================================
        alchemist_stock: [
            // Raw Materials
            { id: 'herb_bundle', name: 'Herb Bundle', price: 12, type: 'raw_material', category: 'herb',
              description: 'Mixed healing herbs. Base ingredient for potions.' },
            { id: 'oil_flask', name: 'Oil Flask', price: 8, type: 'raw_material', category: 'alchemical',
              description: 'Flammable oil for fire-based creations.' },
            // Utility Materials
            { id: 'empty_vial', name: 'Empty Vial', price: 3, type: 'utility_material',
              description: 'Glass container for potions and compounds.' },
            // Basic Supplies
            { id: 'bandage', name: 'Bandage', price: 5, type: 'basic_supply',
              description: 'Stops bleeding. Heals 15 HP slowly.' },
            { id: 'antidote', name: 'Basic Antidote', price: 8, type: 'basic_supply',
              description: 'Cures poison.' }
        ],

        // ========================================================================
        // GENERAL STORE (Helena) - Leather, cloth, wood, utility items
        // ========================================================================
        general_store_stock: [
            // Raw Materials
            { id: 'leather_scraps', name: 'Leather Scraps', price: 12, type: 'raw_material', category: 'leather',
              description: 'Raw leather for light armor crafting.' },
            { id: 'cloth_bolts', name: 'Cloth Bolts', price: 10, type: 'raw_material', category: 'cloth',
              description: 'Basic fabric for robes and magical equipment.' },
            { id: 'timber', name: 'Timber', price: 10, type: 'raw_material', category: 'wood',
              description: 'Quality wood for bows and crossbows.' },
            // Utility Materials
            { id: 'binding_thread', name: 'Binding Thread', price: 6, type: 'utility_material',
              description: 'Strong thread for leather and cloth crafting.' },
            { id: 'wax', name: 'Wax', price: 4, type: 'utility_material',
              description: 'Sealing wax for wood treatment.' },
            // Basic Supplies
            { id: 'torch', name: 'Torch', price: 3, type: 'basic_supply',
              description: 'Lights dark areas. Burns for the whole run.' },
            { id: 'rope', name: 'Rope', price: 8, type: 'basic_supply',
              description: 'Useful for climbing and traps.' }
        ],

        // ========================================================================
        // INNKEEPER (Rosie) - Food only
        // ========================================================================
        innkeeper_stock: [
            { id: 'bread', name: 'Bread', price: 3, type: 'basic_supply',
              description: 'Restores 10 HP. Simple but reliable.', healAmount: 10 },
            { id: 'stew', name: 'Stew', price: 8, type: 'basic_supply',
              description: 'Restores 25 HP. Hearty and filling.', healAmount: 25 },
            { id: 'ale', name: 'Ale', price: 5, type: 'basic_supply',
              description: '+5 Courage for the run. Slightly blurs vision.' },
            { id: 'trail_rations', name: 'Trail Rations', price: 10, type: 'basic_supply',
              description: 'Restores 15 HP over time. Good for long runs.', healOverTime: 15 }
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

        // Use sellPrice if defined, otherwise 50% of buy price
        let sellPrice;
        if (item.sellPrice !== undefined) {
            sellPrice = item.sellPrice;
        } else if (item.price !== undefined) {
            sellPrice = Math.floor(item.price * 0.5);
        } else {
            sellPrice = 5;  // Minimum value for unknown items
        }

        // For stackable items, multiply by count
        const count = item.count || 1;
        const totalPrice = sellPrice * count;

        // Add gold to bank
        if (persistentState?.bank) {
            persistentState.bank.gold += totalPrice;
        }

        // Remove from inventory
        inventory.splice(this.selectedIndex, 1);

        // Adjust selection
        if (this.selectedIndex >= inventory.length) {
            this.selectedIndex = Math.max(0, inventory.length - 1);
        }

        const itemName = count > 1 ? `${item.name} x${count}` : item.name;
        this.message = `Sold ${itemName} for ${totalPrice}g!`;
        console.log(`[ShopUI] Sold ${itemName} for ${totalPrice}g`);
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

            // Calculate sell price properly
            let sellPrice;
            if (item.sellPrice !== undefined) {
                sellPrice = item.sellPrice;
            } else if (item.price !== undefined) {
                sellPrice = Math.floor(item.price * 0.5);
            } else {
                sellPrice = 5;
            }

            const count = item.count || 1;
            const totalPrice = sellPrice * count;

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = '#3a3a5e';
                ctx.fillRect(listX + 5, itemY, listWidth - 10, itemHeight - 5);
            }

            // Item name (with count if stackable)
            ctx.font = isSelected ? 'bold 16px Arial' : '16px Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = this._getItemColor(item.type);
            const displayName = count > 1 ? `${item.name} x${count}` : item.name;
            ctx.fillText(displayName, listX + 15, itemY + 22);

            // Type
            ctx.font = '12px Arial';
            ctx.fillStyle = '#888';
            const typeLabel = item.type?.replace('_', ' ') || 'misc';
            ctx.fillText(typeLabel, listX + 15, itemY + 40);

            // Sell price
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'right';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`${totalPrice}g`, listX + listWidth - 15, itemY + 25);
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
            case 'raw_material': return '#CD853F';      // Peru/tan for raw materials
            case 'utility_material': return '#A0A0A0';  // Gray for utilities
            case 'basic_supply': return '#87CEEB';      // Sky blue for supplies
            case 'dungeon_craft_drop': return '#9932CC'; // Purple for dungeon drops
            case 'sellable_loot': return '#FFD700';     // Gold for sellables
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
