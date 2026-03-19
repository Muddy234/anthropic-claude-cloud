// === js/ui/bank-ui.js ===
// Bank interface for deposits/withdrawals

// ============================================================================
// BANK UI
// ============================================================================

const BankUI = {

    // State
    active: false,
    selectedTab: 0,  // 0 = Bank, 1 = Inventory
    selectedIndex: 0,
    scrollOffset: [0, 0],  // Per-tab scroll
    focusArea: 'list',  // 'tabs', 'list', 'buttons'
    message: '',
    messageType: '',
    messageTimeout: null,

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
        this.focusArea = 'list';
        this.message = '';

        game.state = GAME_STATES ? GAME_STATES.BANK : 'bank';
        console.log('[BankUI] Opened');
    },

    /**
     * Close the bank UI
     */
    close() {
        this.active = false;
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
            this.messageTimeout = null;
        }
        game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
        console.log('[BankUI] Closed');
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
                this._handleListInput(key);
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
                if (this.selectedTab > 0) {
                    this.selectedTab = 0;
                    this.selectedIndex = 0;
                    this.scrollOffset[0] = 0;
                }
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (this.selectedTab < 1) {
                    this.selectedTab = 1;
                    this.selectedIndex = 0;
                    this.scrollOffset[1] = 0;
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
            case 'Enter':
            case ' ':
                this.focusArea = 'list';
                break;
        }
    },

    /**
     * Handle input when item list is focused
     */
    _handleListInput(key) {
        const items = this._getCurrentItems();
        const maxIndex = Math.max(0, items.length - 1);

        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (this.selectedIndex > 0) {
                    this.selectedIndex--;
                    this._ensureVisible();
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
                    this._ensureVisible();
                } else {
                    // Move to buttons when at bottom
                    this.focusArea = 'buttons';
                }
                break;

            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.selectedTab = 0;
                this.selectedIndex = 0;
                this.scrollOffset[0] = 0;
                break;

            case 'ArrowRight':
            case 'd':
            case 'D':
                this.selectedTab = 1;
                this.selectedIndex = 0;
                this.scrollOffset[1] = 0;
                break;

            case 'Enter':
            case 'e':
            case 'E':
            case ' ':
                this._transferSelectedItem();
                break;

            default:
                // Number keys 1-9 for quick selection and transfer
                const numKey = parseInt(key);
                if (numKey >= 1 && numKey <= 9) {
                    const targetIndex = this.scrollOffset[this.selectedTab] + numKey - 1;
                    if (targetIndex < items.length) {
                        this.selectedIndex = targetIndex;
                        this._transferSelectedItem();
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
            case 'ArrowLeft':
            case 'a':
            case 'A':
                // Could switch between multiple buttons here
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                // Could switch between multiple buttons here
                break;
            case 'Enter':
            case ' ':
                this.close();
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
        if (this.selectedIndex >= items.length) {
            this._showMessage('No item selected!', 'error');
            return;
        }

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
        if (!BankingSystem) {
            this._showMessage('Banking system unavailable!', 'error');
            return;
        }

        const bankItems = persistentState?.bank?.items || [];
        if (index >= bankItems.length) return;

        const itemName = bankItems[index]?.name || 'item';
        const item = BankingSystem.withdraw(index);

        if (item) {
            // Add to player inventory
            if (game.player && game.player.inventory) {
                game.player.inventory.push(item);
            }

            this._showMessage(`Withdrew ${itemName}`, 'success');
            console.log(`[BankUI] Withdrew ${item.name}`);

            // Adjust selection if needed
            const items = this._getCurrentItems();
            if (this.selectedIndex >= items.length) {
                this.selectedIndex = Math.max(0, items.length - 1);
            }
        } else {
            this._showMessage('Failed to withdraw item!', 'error');
        }
    },

    /**
     * Deposit item to bank
     * @param {number} index
     * @private
     */
    _depositItem(index) {
        if (!BankingSystem || !game.player || !game.player.inventory) {
            this._showMessage('Cannot deposit right now!', 'error');
            return;
        }

        const item = game.player.inventory[index];
        if (!item) {
            this._showMessage('Invalid item!', 'error');
            return;
        }

        // Check bank capacity
        const bankItems = persistentState?.bank?.items || [];
        const bankCapacity = persistentState?.bank?.capacity || 30;

        if (bankItems.length >= bankCapacity) {
            this._showMessage('Bank is full!', 'error');
            return;
        }

        const itemName = item.name;
        const success = BankingSystem.deposit(item);

        if (success) {
            // Remove from inventory
            game.player.inventory.splice(index, 1);

            this._showMessage(`Deposited ${itemName}`, 'success');
            console.log(`[BankUI] Deposited ${itemName}`);

            // Adjust selection if needed
            const items = this._getCurrentItems();
            if (this.selectedIndex >= items.length) {
                this.selectedIndex = Math.max(0, items.length - 1);
            }
        } else {
            this._showMessage('Failed to deposit item!', 'error');
        }
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

        // Draw message
        if (this.message) {
            this._renderMessage(ctx, panelX, panelY);
        }

        // Draw close button
        this._renderCloseButton(ctx, panelX, panelY);

        // Draw controls hint
        this._renderControls(ctx, panelX, panelY);
    },

    /**
     * Render panel background - CotDG Vault Aesthetic
     * @private
     */
    _renderPanel(ctx, x, y) {
        // Get design system colors
        const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};
        const frameGold = colors.frameGold || '#b8860b';
        const frameGoldBright = colors.frameGoldBright || '#daa520';
        const frameGoldDark = colors.frameGoldDark || '#8b6914';
        const templeStoneDark = colors.templeStoneDark || '#1a1816';

        ctx.save();

        // Heavy shadow (vault door weight)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 8;

        // Main vault door background (iron/stone)
        const bgGrad = ctx.createLinearGradient(x, y, x, y + this.PANEL_HEIGHT);
        bgGrad.addColorStop(0, '#252220');
        bgGrad.addColorStop(0.1, '#1a1816');
        bgGrad.addColorStop(0.9, '#0d0b0a');
        bgGrad.addColorStop(1, '#050404');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Vault rivets/studs along edges
        ctx.fillStyle = '#4a4540';
        const rivetSize = 8;
        const rivetSpacing = 50;
        for (let rx = x + 25; rx < x + this.PANEL_WIDTH - 20; rx += rivetSpacing) {
            // Top row
            ctx.beginPath();
            ctx.arc(rx, y + 15, rivetSize / 2, 0, Math.PI * 2);
            ctx.fill();
            // Bottom row
            ctx.beginPath();
            ctx.arc(rx, y + this.PANEL_HEIGHT - 15, rivetSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        // Rivet highlights
        ctx.fillStyle = '#6a6560';
        for (let rx = x + 25; rx < x + this.PANEL_WIDTH - 20; rx += rivetSpacing) {
            ctx.beginPath();
            ctx.arc(rx - 1, y + 14, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rx - 1, y + this.PANEL_HEIGHT - 16, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Use design system temple frame if available
        if (typeof drawTempleFrame === 'function') {
            drawTempleFrame(ctx, x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT, {
                cornerSize: 24, borderWidth: 5, pattern: true
            });
        } else {
            // Heavy gold border (vault trim)
            const frameGrad = ctx.createLinearGradient(x, y, x + this.PANEL_WIDTH, y + this.PANEL_HEIGHT);
            frameGrad.addColorStop(0, frameGoldBright);
            frameGrad.addColorStop(0.25, frameGold);
            frameGrad.addColorStop(0.5, frameGoldDark);
            frameGrad.addColorStop(0.75, frameGold);
            frameGrad.addColorStop(1, frameGoldBright);
            ctx.strokeStyle = frameGrad;
            ctx.lineWidth = 5;
            ctx.strokeRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);
        }

        // Add ornate corners if available
        if (typeof drawOrnateCorners === 'function') {
            drawOrnateCorners(ctx, x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT, { size: 22 });
        }

        // Title with vault emblem
        ctx.font = 'bold 26px serif';
        ctx.textAlign = 'center';

        // Title glow effect
        ctx.shadowColor = frameGold;
        ctx.shadowBlur = 8;
        ctx.fillStyle = frameGoldBright;
        ctx.fillText('THE VAULT', x + this.PANEL_WIDTH / 2, y + 38);
        ctx.shadowBlur = 0;

        // Decorative lines under title
        ctx.strokeStyle = frameGoldDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + this.PANEL_WIDTH / 2 - 100, y + 46);
        ctx.lineTo(x + this.PANEL_WIDTH / 2 + 100, y + 46);
        ctx.stroke();

        // Small vault lock symbol in center
        ctx.fillStyle = frameGold;
        ctx.beginPath();
        ctx.arc(x + this.PANEL_WIDTH / 2, y + 46, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = templeStoneDark;
        ctx.beginPath();
        ctx.arc(x + this.PANEL_WIDTH / 2, y + 46, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    /**
     * Render tab buttons - Stone Tablet Style
     * @private
     */
    _renderTabs(ctx, panelX, panelY) {
        // Get design system colors
        const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};
        const frameGold = colors.frameGold || '#b8860b';
        const frameGoldBright = colors.frameGoldBright || '#daa520';
        const frameGoldDark = colors.frameGoldDark || '#8b6914';

        const tabWidth = 150;
        const tabHeight = 38;
        const startX = panelX + 20;
        const tabY = panelY + 55;
        const tabsFocused = this.focusArea === 'tabs';

        this.TABS.forEach((tab, index) => {
            const tabX = startX + index * (tabWidth + 15);
            const isSelected = index === this.selectedTab;
            const isFocused = tabsFocused && isSelected;

            // Use design system stone button if available
            if (typeof drawStoneButton === 'function') {
                drawStoneButton(ctx, tabX, tabY, tabWidth, tabHeight, tab, {
                    selected: isSelected,
                    focused: isFocused,
                    icon: index === 0 ? '🏛' : '📦'
                });
            } else {
                // Stone tablet background
                const tabGrad = ctx.createLinearGradient(tabX, tabY, tabX, tabY + tabHeight);
                if (isSelected) {
                    tabGrad.addColorStop(0, '#3a3530');
                    tabGrad.addColorStop(0.5, '#2a2520');
                    tabGrad.addColorStop(1, '#1a1510');
                } else {
                    tabGrad.addColorStop(0, '#252220');
                    tabGrad.addColorStop(0.5, '#1a1816');
                    tabGrad.addColorStop(1, '#0d0b0a');
                }
                ctx.fillStyle = tabGrad;
                ctx.fillRect(tabX, tabY, tabWidth, tabHeight);

                // Tab border
                ctx.strokeStyle = isFocused ? '#ffffff' : (isSelected ? frameGoldBright : frameGoldDark);
                ctx.lineWidth = isFocused ? 3 : 2;
                ctx.strokeRect(tabX, tabY, tabWidth, tabHeight);

                // Corner accents
                if (isSelected) {
                    ctx.fillStyle = frameGold;
                    // Top-left
                    ctx.fillRect(tabX, tabY, 6, 2);
                    ctx.fillRect(tabX, tabY, 2, 6);
                    // Top-right
                    ctx.fillRect(tabX + tabWidth - 6, tabY, 6, 2);
                    ctx.fillRect(tabX + tabWidth - 2, tabY, 2, 6);
                    // Bottom-left
                    ctx.fillRect(tabX, tabY + tabHeight - 2, 6, 2);
                    ctx.fillRect(tabX, tabY + tabHeight - 6, 2, 6);
                    // Bottom-right
                    ctx.fillRect(tabX + tabWidth - 6, tabY + tabHeight - 2, 6, 2);
                    ctx.fillRect(tabX + tabWidth - 2, tabY + tabHeight - 6, 2, 6);
                }

                // Tab text
                ctx.font = isSelected ? 'bold 14px serif' : '14px serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = isSelected ? frameGoldBright : (colors.textMuted || '#706850');
                ctx.fillText(tab, tabX + tabWidth / 2, tabY + 24);
            }

            // Item count (below tab)
            const items = index === 0 ?
                (persistentState?.bank?.items || []) :
                (game?.player?.inventory || []);
            ctx.font = '11px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = isSelected ? frameGold : (colors.textMuted || '#706850');
            ctx.fillText(`(${items.length})`, tabX + tabWidth / 2, tabY + tabHeight + 14);
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
        const listFocused = this.focusArea === 'list';

        // List background
        ctx.fillStyle = '#12121a';
        ctx.fillRect(listX, listY, listWidth, this.ITEMS_PER_PAGE * itemHeight + 10);

        // List border - highlight when focused
        ctx.strokeStyle = listFocused ? '#FFD700' : '#3a3a5a';
        ctx.lineWidth = listFocused ? 2 : 1;
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
            const isSelected = realIndex === this.selectedIndex && listFocused;

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = '#3a4a3e';
                ctx.fillRect(listX + 5, itemY, listWidth - 10, itemHeight - 2);

                // Selection border
                ctx.strokeStyle = '#8aff8a';
                ctx.lineWidth = 2;
                ctx.strokeRect(listX + 5, itemY, listWidth - 10, itemHeight - 2);
            }

            // Item number (for quick selection)
            if (idx < 9) {
                ctx.font = '12px Arial';
                ctx.textAlign = 'left';
                ctx.fillStyle = '#666';
                ctx.fillText(`[${idx + 1}]`, listX + 10, itemY + 25);
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
            ctx.fillText(item.name, listX + 40, itemY + 25);

            // Item type and count
            ctx.font = '12px Arial';
            ctx.fillStyle = '#888';
            const typeText = item.type ? (item.type.charAt(0).toUpperCase() + item.type.slice(1)) : 'Item';
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

            // Action hint for selected item
            if (isSelected) {
                ctx.fillStyle = '#8aff8a';
                ctx.font = '10px Arial';
                const actionHint = this.selectedTab === 0 ? 'WITHDRAW' : 'DEPOSIT';
                ctx.fillText(`[Enter] ${actionHint}`, listX + listWidth - 20, itemY + 38);
            }
        });

        // Scroll indicators
        if (offset > 0) {
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.font = '12px Arial';
            ctx.fillText(String.fromCharCode(9650) + ' more items above', listX + listWidth / 2, listY + 15);
        }
        if (offset + this.ITEMS_PER_PAGE < items.length) {
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.font = '12px Arial';
            ctx.fillText(String.fromCharCode(9660) + ' more items below', listX + listWidth / 2, listY + this.ITEMS_PER_PAGE * itemHeight);
        }

        // Scrollbar
        if (items.length > this.ITEMS_PER_PAGE) {
            const scrollHeight = this.ITEMS_PER_PAGE * itemHeight;
            const barHeight = (this.ITEMS_PER_PAGE / items.length) * scrollHeight;
            const barY = listY + (offset / items.length) * scrollHeight;

            ctx.fillStyle = '#3a3a5a';
            ctx.fillRect(listX + listWidth - 8, listY, 6, scrollHeight);
            ctx.fillStyle = listFocused ? '#FFD700' : '#8888FF';
            ctx.fillRect(listX + listWidth - 8, barY, 6, barHeight);
        }
    },

    /**
     * Render message
     * @private
     */
    _renderMessage(ctx, panelX, panelY) {
        const msgY = panelY + this.PANEL_HEIGHT - 60;

        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.messageType === 'error' ? '#e74c3c' : '#2ecc71';
        ctx.fillText(this.message, panelX + this.PANEL_WIDTH / 2, msgY);
    },

    /**
     * Render close button - Stone Button Style
     * @private
     */
    _renderCloseButton(ctx, panelX, panelY) {
        const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};
        const frameGold = colors.frameGold || '#b8860b';
        const frameGoldBright = colors.frameGoldBright || '#daa520';

        const btnX = panelX + this.PANEL_WIDTH - 130;
        const btnY = panelY + this.PANEL_HEIGHT - 55;
        const btnW = 110;
        const btnH = 40;
        const isFocused = this.focusArea === 'buttons';

        // Use design system stone button if available
        if (typeof drawStoneButton === 'function') {
            drawStoneButton(ctx, btnX, btnY, btnW, btnH, 'CLOSE', {
                selected: false, focused: isFocused, danger: true
            });
        } else {
            // Stone button background with danger tint
            const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
            if (isFocused) {
                btnGrad.addColorStop(0, '#5a2020');
                btnGrad.addColorStop(0.5, '#4a1a1a');
                btnGrad.addColorStop(1, '#3a1010');
            } else {
                btnGrad.addColorStop(0, '#3a2020');
                btnGrad.addColorStop(0.5, '#2a1515');
                btnGrad.addColorStop(1, '#1a0a0a');
            }
            ctx.fillStyle = btnGrad;
            ctx.fillRect(btnX, btnY, btnW, btnH);

            // Button border
            ctx.strokeStyle = isFocused ? '#ff6b6b' : '#a82828';
            ctx.lineWidth = isFocused ? 3 : 2;
            ctx.strokeRect(btnX, btnY, btnW, btnH);

            // Corner gold accents
            ctx.fillStyle = frameGold;
            const cs = 4;
            ctx.fillRect(btnX, btnY, cs, 2);
            ctx.fillRect(btnX, btnY, 2, cs);
            ctx.fillRect(btnX + btnW - cs, btnY, cs, 2);
            ctx.fillRect(btnX + btnW - 2, btnY, 2, cs);
            ctx.fillRect(btnX, btnY + btnH - 2, cs, 2);
            ctx.fillRect(btnX, btnY + btnH - cs, 2, cs);
            ctx.fillRect(btnX + btnW - cs, btnY + btnH - 2, cs, 2);
            ctx.fillRect(btnX + btnW - 2, btnY + btnH - cs, 2, cs);

            // Button text
            ctx.font = 'bold 14px serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = isFocused ? '#ff8888' : '#cc6666';
            ctx.fillText('CLOSE', btnX + btnW / 2, btnY + 26);
        }
    },

    /**
     * Render control hints
     * @private
     */
    _renderControls(ctx, panelX, panelY) {
        const controlsY = panelY + this.PANEL_HEIGHT - 20;

        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#888';

        const action = this.selectedTab === 0 ? 'Withdraw' : 'Deposit';
        ctx.fillText(
            String.fromCharCode(8593) + String.fromCharCode(8595) + ' Navigate | ' +
            String.fromCharCode(8592) + String.fromCharCode(8594) + ' Switch Tab | ' +
            `[1-9] Quick ${action} | [Enter] ${action} | [Tab] Focus | [ESC] Close`,
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
        // Prevent default for Tab to avoid losing focus
        if (e.key === 'Tab') {
            e.preventDefault();
        }
        BankUI.handleInput(e.key, e.shiftKey);
    }
});

// ============================================================================
// EXPORTS
// ============================================================================

window.BankUI = BankUI;

console.log('[BankUI] Bank UI loaded (with keyboard navigation)');
