// === js/ui/bank-ui.js ===
// SURVIVAL EXTRACTION UPDATE: Bank interface for deposits/withdrawals

// ============================================================================
// BANK UI
// ============================================================================

const BankUI = {

    // State
    active: false,
    selectedTab: 0,  // 0 = Bank, 1 = Inventory
    selectedIndex: 0,
    scrollOffset: [0, 0],  // Per-tab scroll

    // Layout
    PANEL_WIDTH: 900,
    PANEL_HEIGHT: 600,
    ITEMS_PER_PAGE: 12,

    // Tabs
    TABS: ['BANK', 'INVENTORY'],

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Open the bank UI
     */
    open() {
        this.active = true;
        this.selectedTab = 0;
        this.selectedIndex = 0;
        this.scrollOffset = [0, 0];

        game.state = GAME_STATES ? GAME_STATES.BANK : 'bank';
        console.log('[BankUI] Opened');
    },

    /**
     * Close the bank UI
     */
    close() {
        this.active = false;
        game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
        console.log('[BankUI] Closed');
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

        const items = this._getCurrentItems();

        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                this._ensureVisible();
                break;

            case 'ArrowDown':
            case 's':
            case 'S':
                this.selectedIndex = Math.min(items.length - 1, this.selectedIndex + 1);
                this._ensureVisible();
                break;

            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.selectedTab = (this.selectedTab - 1 + 2) % 2;
                this.selectedIndex = 0;
                this.scrollOffset[this.selectedTab] = 0;
                break;

            case 'ArrowRight':
            case 'd':
            case 'D':
                this.selectedTab = (this.selectedTab + 1) % 2;
                this.selectedIndex = 0;
                this.scrollOffset[this.selectedTab] = 0;
                break;

            case 'Enter':
            case 'e':
            case 'E':
            case ' ':
                this._transferSelectedItem();
                break;

            case 'Escape':
                this.close();
                break;

            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                const idx = parseInt(key) - 1;
                if (idx < items.length) {
                    this.selectedIndex = idx;
                    this._transferSelectedItem();
                }
                break;
        }
    },

    /**
     * Get items for current tab
     * @returns {Array}
     * @private
     */
    _getCurrentItems() {
        if (this.selectedTab === 0) {
            // Bank items
            return persistentState?.bank?.items || [];
        } else {
            // Player inventory (only during village, not during run)
            // In village, we use villageState.player.inventory if available
            return game?.player?.inventory || [];
        }
    },

    /**
     * Ensure selected item is visible
     * @private
     */
    _ensureVisible() {
        const offset = this.scrollOffset[this.selectedTab];
        if (this.selectedIndex < offset) {
            this.scrollOffset[this.selectedTab] = this.selectedIndex;
        } else if (this.selectedIndex >= offset + this.ITEMS_PER_PAGE) {
            this.scrollOffset[this.selectedTab] = this.selectedIndex - this.ITEMS_PER_PAGE + 1;
        }
    },

    /**
     * Transfer selected item between bank and inventory
     * @private
     */
    _transferSelectedItem() {
        const items = this._getCurrentItems();
        if (this.selectedIndex >= items.length) return;

        if (this.selectedTab === 0) {
            // Withdraw from bank
            this._withdrawItem(this.selectedIndex);
        } else {
            // Deposit to bank
            this._depositItem(this.selectedIndex);
        }
    },

    /**
     * Withdraw item from bank
     * @param {number} index
     * @private
     */
    _withdrawItem(index) {
        if (!BankingSystem) return;

        const item = BankingSystem.withdraw(index);
        if (item) {
            // Add to player inventory
            if (game.player && game.player.inventory) {
                game.player.inventory.push(item);
            }
            console.log(`[BankUI] Withdrew ${item.name}`);

            // Adjust selection if needed
            const items = this._getCurrentItems();
            if (this.selectedIndex >= items.length) {
                this.selectedIndex = Math.max(0, items.length - 1);
            }
        }
    },

    /**
     * Deposit item to bank
     * @param {number} index
     * @private
     */
    _depositItem(index) {
        if (!BankingSystem || !game.player || !game.player.inventory) return;

        const item = game.player.inventory[index];
        if (!item) return;

        const success = BankingSystem.deposit(item);
        if (success) {
            // Remove from inventory
            game.player.inventory.splice(index, 1);
            console.log(`[BankUI] Deposited ${item.name}`);

            // Adjust selection if needed
            const items = this._getCurrentItems();
            if (this.selectedIndex >= items.length) {
                this.selectedIndex = Math.max(0, items.length - 1);
            }
        }
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render the bank UI
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.active) return;

        const canvas = ctx.canvas;

        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate panel position
        const panelX = (canvas.width - this.PANEL_WIDTH) / 2;
        const panelY = (canvas.height - this.PANEL_HEIGHT) / 2;

        // Draw panel background
        this._renderPanel(ctx, panelX, panelY);

        // Draw tabs
        this._renderTabs(ctx, panelX, panelY);

        // Draw gold display
        this._renderGold(ctx, panelX, panelY);

        // Draw items
        this._renderItems(ctx, panelX, panelY);

        // Draw controls hint
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
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        // Title
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('THE VAULT', x + this.PANEL_WIDTH / 2, y + 35);
    },

    /**
     * Render tab buttons
     * @private
     */
    _renderTabs(ctx, panelX, panelY) {
        const tabWidth = 150;
        const tabHeight = 35;
        const startX = panelX + 20;
        const tabY = panelY + 50;

        this.TABS.forEach((tab, index) => {
            const tabX = startX + index * (tabWidth + 10);
            const isSelected = index === this.selectedTab;

            // Tab background
            if (isSelected) {
                const grad = ctx.createLinearGradient(tabX, tabY, tabX, tabY + tabHeight);
                grad.addColorStop(0, '#FFD700');
                grad.addColorStop(1, '#B8860B');
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = '#2a2a4e';
            }
            ctx.fillRect(tabX, tabY, tabWidth, tabHeight);

            // Tab border
            ctx.strokeStyle = isSelected ? '#FFD700' : '#4a4a6a';
            ctx.lineWidth = 2;
            ctx.strokeRect(tabX, tabY, tabWidth, tabHeight);

            // Tab text
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = isSelected ? '#000' : '#AAA';
            ctx.fillText(tab, tabX + tabWidth / 2, tabY + 23);

            // Item count
            const items = index === 0 ?
                (persistentState?.bank?.items || []) :
                (game?.player?.inventory || []);
            ctx.font = '12px Arial';
            ctx.fillStyle = isSelected ? '#333' : '#666';
            ctx.fillText(`(${items.length})`, tabX + tabWidth / 2, tabY + tabHeight + 12);
        });
    },

    /**
     * Render gold display
     * @private
     */
    _renderGold(ctx, panelX, panelY) {
        const goldX = panelX + this.PANEL_WIDTH - 180;
        const goldY = panelY + 55;

        // Bank gold
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#FFD700';
        const bankGold = persistentState?.bank?.gold || 0;
        ctx.fillText(`Bank: ${bankGold}g`, goldX + 150, goldY);

        // Player gold
        ctx.fillStyle = '#AAA';
        const playerGold = game?.player?.gold || 0;
        ctx.fillText(`Pocket: ${playerGold}g`, goldX + 150, goldY + 20);
    },

    /**
     * Render item list
     * @private
     */
    _renderItems(ctx, panelX, panelY) {
        const items = this._getCurrentItems();
        const listX = panelX + 30;
        const listY = panelY + 110;
        const listWidth = this.PANEL_WIDTH - 60;
        const itemHeight = 40;

        // List background
        ctx.fillStyle = '#12121a';
        ctx.fillRect(listX, listY, listWidth, this.ITEMS_PER_PAGE * itemHeight + 10);
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 1;
        ctx.strokeRect(listX, listY, listWidth, this.ITEMS_PER_PAGE * itemHeight + 10);

        if (items.length === 0) {
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#666';
            ctx.fillText(
                this.selectedTab === 0 ? 'Bank is empty' : 'Inventory is empty',
                panelX + this.PANEL_WIDTH / 2,
                listY + 100
            );
            return;
        }

        // Get visible items
        const offset = this.scrollOffset[this.selectedTab];
        const visibleItems = items.slice(offset, offset + this.ITEMS_PER_PAGE);

        // Render each item
        visibleItems.forEach((item, idx) => {
            const realIndex = offset + idx;
            const itemY = listY + 5 + idx * itemHeight;
            const isSelected = realIndex === this.selectedIndex;

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = '#3a3a5e';
                ctx.fillRect(listX + 5, itemY, listWidth - 10, itemHeight - 2);

                // Selection border
                ctx.strokeStyle = '#8888FF';
                ctx.lineWidth = 2;
                ctx.strokeRect(listX + 5, itemY, listWidth - 10, itemHeight - 2);
            }

            // Item rarity color
            const rarityColors = {
                common: '#FFFFFF',
                uncommon: '#2ecc71',
                rare: '#3498db',
                epic: '#9b59b6',
                legendary: '#FFD700'
            };
            const color = rarityColors[item.rarity] || '#FFFFFF';

            // Item name
            ctx.font = isSelected ? 'bold 16px Arial' : '16px Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = color;
            ctx.fillText(item.name, listX + 15, itemY + 25);

            // Item type and count
            ctx.font = '12px Arial';
            ctx.fillStyle = '#888';
            const typeText = item.type.charAt(0).toUpperCase() + item.type.slice(1);
            ctx.fillText(typeText, listX + 300, itemY + 25);

            // Stack count
            if (item.count && item.count > 1) {
                ctx.textAlign = 'right';
                ctx.fillStyle = '#AAA';
                ctx.fillText(`x${item.count}`, listX + listWidth - 100, itemY + 25);
            }

            // Sell value
            ctx.textAlign = 'right';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`${item.sellValue || 0}g`, listX + listWidth - 20, itemY + 25);
        });

        // Scrollbar
        if (items.length > this.ITEMS_PER_PAGE) {
            const scrollHeight = this.ITEMS_PER_PAGE * itemHeight;
            const barHeight = (this.ITEMS_PER_PAGE / items.length) * scrollHeight;
            const barY = listY + (offset / items.length) * scrollHeight;

            ctx.fillStyle = '#3a3a5a';
            ctx.fillRect(listX + listWidth - 8, listY, 6, scrollHeight);
            ctx.fillStyle = '#8888FF';
            ctx.fillRect(listX + listWidth - 8, barY, 6, barHeight);
        }
    },

    /**
     * Render control hints
     * @private
     */
    _renderControls(ctx, panelX, panelY) {
        const controlsY = panelY + this.PANEL_HEIGHT - 30;

        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#888';

        const action = this.selectedTab === 0 ? 'Withdraw' : 'Deposit';
        ctx.fillText(
            `[Up/Down] Select | [Left/Right] Switch Tab | [E/Enter] ${action} | [ESC] Close`,
            panelX + this.PANEL_WIDTH / 2,
            controlsY
        );
    }
};

// ============================================================================
// KEYBOARD HOOK
// ============================================================================

// Hook into global keyboard handler
window.addEventListener('keydown', (e) => {
    if (game.state === 'bank' || game.state === GAME_STATES?.BANK) {
        BankUI.handleInput(e.key);
    }
});

// ============================================================================
// EXPORTS
// ============================================================================

window.BankUI = BankUI;

console.log('[BankUI] Bank UI loaded');
