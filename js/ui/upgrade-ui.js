// ============================================================================
// UPGRADE UI - Equipment Enhancement Interface
// ============================================================================
//
// Allows players to upgrade their equipment at the blacksmith
// Uses the UpgradeSystem for actual upgrade logic
// ============================================================================

const UpgradeUI = {

    // State
    active: false,
    selectedIndex: 0,
    currentTab: 0,  // 0 = select item, 1 = view requirements

    // Layout
    PANEL_WIDTH: 850,
    PANEL_HEIGHT: 600,

    // Cached data
    upgradeableItems: [],
    selectedItem: null,
    upgradeCheck: null,
    upgradePreview: null,
    message: '',
    messageType: 'info',  // 'info', 'success', 'error'

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Open the upgrade UI
     * @param {Object} npc - The NPC offering upgrades (Blacksmith)
     */
    open(npc) {
        this.active = true;
        this.currentNPC = npc;
        this.selectedIndex = 0;
        this.currentTab = 0;
        this.message = '';
        this.selectedItem = null;
        this.upgradeCheck = null;
        this.upgradePreview = null;

        // Get all upgradeable items from player inventory
        this.refreshUpgradeableItems();

        game.state = GAME_STATES ? GAME_STATES.UPGRADE : 'upgrade';
        console.log('[UpgradeUI] Opened');
    },

    /**
     * Refresh the list of upgradeable items
     */
    refreshUpgradeableItems() {
        const inventory = game.player?.inventory || [];

        if (typeof UpgradeSystem !== 'undefined') {
            this.upgradeableItems = UpgradeSystem.getUpgradeableItems(inventory);
        } else {
            // Fallback: filter for weapons/armor
            this.upgradeableItems = inventory.filter(item =>
                item && (item.type === 'weapon' || item.type === 'armor')
            );
        }

        // Update selection
        if (this.selectedIndex >= this.upgradeableItems.length) {
            this.selectedIndex = Math.max(0, this.upgradeableItems.length - 1);
        }

        this.updateSelectedItem();
    },

    /**
     * Update data for currently selected item
     */
    updateSelectedItem() {
        if (this.upgradeableItems.length === 0) {
            this.selectedItem = null;
            this.upgradeCheck = null;
            this.upgradePreview = null;
            return;
        }

        this.selectedItem = this.upgradeableItems[this.selectedIndex];

        if (typeof UpgradeSystem !== 'undefined' && this.selectedItem) {
            const inventory = game.player?.inventory || [];
            this.upgradeCheck = UpgradeSystem.checkUpgradeRequirements(this.selectedItem, inventory);
            this.upgradePreview = UpgradeSystem.getUpgradePreview(this.selectedItem);
        }
    },

    /**
     * Close the upgrade UI
     */
    close() {
        this.active = false;
        this.currentNPC = null;
        game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
        console.log('[UpgradeUI] Closed');
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

        const maxIndex = this.upgradeableItems.length - 1;

        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                this.updateSelectedItem();
                break;

            case 'ArrowDown':
            case 's':
            case 'S':
                this.selectedIndex = Math.min(maxIndex, this.selectedIndex + 1);
                this.updateSelectedItem();
                break;

            case 'ArrowLeft':
            case 'a':
            case 'A':
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.currentTab = this.currentTab === 0 ? 1 : 0;
                break;

            case 'Enter':
            case 'e':
            case 'E':
            case ' ':
                this._performUpgrade();
                break;

            case 'Escape':
                this.close();
                break;
        }
    },

    /**
     * Perform the upgrade on selected item
     * @private
     */
    _performUpgrade() {
        if (!this.selectedItem) {
            this.message = 'No item selected';
            this.messageType = 'error';
            return;
        }

        if (!this.upgradeCheck?.canUpgrade) {
            this.message = 'Missing required materials!';
            this.messageType = 'error';
            return;
        }

        if (typeof UpgradeSystem === 'undefined') {
            this.message = 'Upgrade system not available';
            this.messageType = 'error';
            return;
        }

        const inventory = game.player?.inventory || [];
        const result = UpgradeSystem.upgradeItem(this.selectedItem, inventory);

        if (result.success) {
            this.message = result.message;
            this.messageType = 'success';

            // Refresh the list (item may no longer be upgradeable if maxed)
            this.refreshUpgradeableItems();

            console.log(`[UpgradeUI] ${result.message}`);
        } else {
            this.message = result.message;
            this.messageType = 'error';
        }
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render the upgrade UI
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.active) return;

        const canvas = ctx.canvas;

        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate panel position
        const panelX = (canvas.width - this.PANEL_WIDTH) / 2;
        const panelY = (canvas.height - this.PANEL_HEIGHT) / 2;

        // Draw panel
        this._renderPanel(ctx, panelX, panelY);

        // Draw item list (left side)
        this._renderItemList(ctx, panelX, panelY);

        // Draw upgrade details (right side)
        this._renderUpgradeDetails(ctx, panelX, panelY);

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
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FF6347';
        ctx.fillText('Equipment Upgrades', x + this.PANEL_WIDTH / 2, y + 35);

        // Subtitle
        ctx.font = '14px Arial';
        ctx.fillStyle = '#888';
        ctx.fillText('Select equipment to enhance (max +3)', x + this.PANEL_WIDTH / 2, y + 55);
    },

    /**
     * Render item selection list
     * @private
     */
    _renderItemList(ctx, panelX, panelY) {
        const listX = panelX + 20;
        const listY = panelY + 75;
        const listWidth = 350;
        const listHeight = 400;
        const itemHeight = 60;

        // List background
        ctx.fillStyle = '#12121a';
        ctx.fillRect(listX, listY, listWidth, listHeight);

        // Title
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#CCC';
        ctx.fillText('Your Equipment', listX + 10, listY - 5);

        if (this.upgradeableItems.length === 0) {
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#666';
            ctx.fillText('No upgradeable items', listX + listWidth / 2, listY + 100);
            ctx.fillText('Find weapons/armor in the dungeon!', listX + listWidth / 2, listY + 125);
            return;
        }

        const maxVisible = Math.floor(listHeight / itemHeight);
        const startIdx = Math.max(0, this.selectedIndex - Math.floor(maxVisible / 2));
        const visibleItems = this.upgradeableItems.slice(startIdx, startIdx + maxVisible);

        visibleItems.forEach((item, idx) => {
            const realIndex = startIdx + idx;
            const itemY = listY + 5 + idx * itemHeight;
            const isSelected = realIndex === this.selectedIndex;
            const level = UpgradeSystem ? UpgradeSystem.getUpgradeLevel(item) : 0;

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = '#3a3a5e';
                ctx.fillRect(listX + 5, itemY, listWidth - 10, itemHeight - 5);

                // Selection indicator
                ctx.fillStyle = '#FF6347';
                ctx.fillRect(listX + 5, itemY, 4, itemHeight - 5);
            }

            // Item name with upgrade level
            ctx.font = isSelected ? 'bold 16px Arial' : '16px Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = this._getRarityColor(item.rarity);

            const displayName = level > 0 ? `${item.baseName || item.name} +${level}` : item.name;
            ctx.fillText(displayName, listX + 15, itemY + 22);

            // Item type
            ctx.font = '12px Arial';
            ctx.fillStyle = '#888';
            ctx.fillText(item.type || 'equipment', listX + 15, itemY + 40);

            // Current upgrade level indicator
            ctx.textAlign = 'right';
            if (level >= 3) {
                ctx.fillStyle = '#FFD700';
                ctx.fillText('MAX', listX + listWidth - 15, itemY + 30);
            } else {
                ctx.fillStyle = '#8888FF';
                ctx.fillText(`+${level} → +${level + 1}`, listX + listWidth - 15, itemY + 30);
            }
        });
    },

    /**
     * Render upgrade details panel
     * @private
     */
    _renderUpgradeDetails(ctx, panelX, panelY) {
        const detailsX = panelX + 390;
        const detailsY = panelY + 75;
        const detailsWidth = 440;
        const detailsHeight = 400;

        // Details background
        ctx.fillStyle = '#12121a';
        ctx.fillRect(detailsX, detailsY, detailsWidth, detailsHeight);

        // Title
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#CCC';
        ctx.fillText('Upgrade Details', detailsX + 10, detailsY - 5);

        if (!this.selectedItem) {
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#666';
            ctx.fillText('Select an item to upgrade', detailsX + detailsWidth / 2, detailsY + 100);
            return;
        }

        const preview = this.upgradePreview;
        const check = this.upgradeCheck;

        if (preview?.maxed) {
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFD700';
            ctx.fillText('MAXIMUM LEVEL REACHED', detailsX + detailsWidth / 2, detailsY + 50);

            ctx.font = '14px Arial';
            ctx.fillStyle = '#888';
            ctx.fillText('This item cannot be upgraded further.', detailsX + detailsWidth / 2, detailsY + 80);
            ctx.fillText('Use it wisely - death means losing it forever!', detailsX + detailsWidth / 2, detailsY + 100);
            return;
        }

        let yOffset = detailsY + 30;

        // Upgrade level change
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFF';
        ctx.fillText(`Upgrade: +${preview.currentLevel} → +${preview.nextLevel}`, detailsX + 15, yOffset);

        yOffset += 25;

        // Stat changes
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#4CAF50';
        ctx.fillText('Stat Changes:', detailsX + 15, yOffset);
        yOffset += 20;

        ctx.font = '14px Arial';
        for (const change of preview.statChanges || []) {
            ctx.fillStyle = '#888';
            ctx.fillText(`${change.stat}:`, detailsX + 25, yOffset);

            ctx.fillStyle = '#FFF';
            ctx.textAlign = 'right';
            ctx.fillText(`${change.current} → `, detailsX + 180, yOffset);

            ctx.fillStyle = '#4CAF50';
            ctx.fillText(`${change.next}`, detailsX + 220, yOffset);
            ctx.textAlign = 'left';

            yOffset += 20;
        }

        yOffset += 15;

        // Required materials header
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#FF6347';
        ctx.fillText('Required Materials:', detailsX + 15, yOffset);
        yOffset += 25;

        // Overworld materials
        const recipe = check?.recipe;
        if (recipe?.overworldMaterials) {
            ctx.font = '13px Arial';
            ctx.fillStyle = '#CD853F';
            ctx.fillText('Overworld:', detailsX + 25, yOffset);
            yOffset += 18;

            for (const [matId, required] of Object.entries(recipe.overworldMaterials)) {
                const mat = typeof getRawMaterial === 'function' ? getRawMaterial(matId) : { name: matId };
                const have = check.have?.[matId] || 0;
                const hasEnough = have >= required;

                ctx.fillStyle = hasEnough ? '#4CAF50' : '#e74c3c';
                ctx.fillText(`  ${mat?.name || matId}: ${have}/${required}`, detailsX + 35, yOffset);

                if (hasEnough) {
                    ctx.fillText(' ✓', detailsX + 250, yOffset);
                } else {
                    ctx.fillText(' ✗', detailsX + 250, yOffset);
                }

                yOffset += 18;
            }
        }

        yOffset += 5;

        // Dungeon drops
        if (recipe?.dungeonDrops) {
            ctx.font = '13px Arial';
            ctx.fillStyle = '#9932CC';
            ctx.fillText('Dungeon Drops:', detailsX + 25, yOffset);
            yOffset += 18;

            const tierName = recipe.dungeonDrops.tier === 3 ? 'Elite Boss' :
                           `Tier ${recipe.dungeonDrops.tier}`;
            const have = check.dungeonDropCount || 0;
            const required = recipe.dungeonDrops.count;
            const hasEnough = have >= required;

            ctx.fillStyle = hasEnough ? '#4CAF50' : '#e74c3c';
            ctx.fillText(`  ${tierName} drops: ${have}/${required}`, detailsX + 35, yOffset);

            if (hasEnough) {
                ctx.fillText(' ✓', detailsX + 250, yOffset);
            } else {
                ctx.fillText(' ✗', detailsX + 250, yOffset);
            }
        }

        yOffset += 35;

        // Upgrade button/status
        ctx.textAlign = 'center';
        if (check?.canUpgrade) {
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(detailsX + 100, yOffset, 240, 40);
            ctx.strokeStyle = '#2E7D32';
            ctx.lineWidth = 2;
            ctx.strokeRect(detailsX + 100, yOffset, 240, 40);

            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#FFF';
            ctx.fillText('Press [E] to Upgrade', detailsX + 220, yOffset + 26);
        } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(detailsX + 100, yOffset, 240, 40);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.strokeRect(detailsX + 100, yOffset, 240, 40);

            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#888';
            ctx.fillText('Missing Materials', detailsX + 220, yOffset + 26);
        }

        ctx.textAlign = 'left';

        yOffset += 60;

        // Warning
        ctx.font = '12px Arial';
        ctx.fillStyle = '#e74c3c';
        ctx.textAlign = 'center';
        ctx.fillText('Warning: Upgraded gear is LOST FOREVER on death!', detailsX + detailsWidth / 2, yOffset);
        ctx.textAlign = 'left';
    },

    /**
     * Get color for item rarity
     * @private
     */
    _getRarityColor(rarity) {
        switch (rarity) {
            case 'common': return '#FFFFFF';
            case 'uncommon': return '#4CAF50';
            case 'rare': return '#2196F3';
            case 'epic': return '#9C27B0';
            case 'legendary': return '#FFD700';
            default: return '#FFFFFF';
        }
    },

    /**
     * Render message
     * @private
     */
    _renderMessage(ctx, panelX, panelY) {
        const msgY = panelY + 500;

        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';

        switch (this.messageType) {
            case 'success':
                ctx.fillStyle = '#4CAF50';
                break;
            case 'error':
                ctx.fillStyle = '#e74c3c';
                break;
            default:
                ctx.fillStyle = '#FFF';
        }

        ctx.fillText(this.message, panelX + this.PANEL_WIDTH / 2, msgY);

        // Clear message after a few seconds
        setTimeout(() => { this.message = ''; }, 2500);
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
            '[W/S] Select Item | [E/Enter] Upgrade | [ESC] Close',
            panelX + this.PANEL_WIDTH / 2,
            controlsY
        );
    }
};

// ============================================================================
// KEYBOARD HOOK
// ============================================================================

window.addEventListener('keydown', (e) => {
    if (game.state === 'upgrade' || game.state === GAME_STATES?.UPGRADE) {
        UpgradeUI.handleInput(e.key);
    }
});

// ============================================================================
// DIALOGUE ACTION HANDLER
// ============================================================================

// Hook into dialogue system to handle 'open_upgrade' action
if (typeof DialogueSystem !== 'undefined') {
    const originalHandleAction = DialogueSystem.handleAction;
    DialogueSystem.handleAction = function(action, npc) {
        if (action === 'open_upgrade') {
            UpgradeUI.open(npc);
            return true;
        }
        return originalHandleAction?.call(this, action, npc);
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

window.UpgradeUI = UpgradeUI;

// Add UPGRADE to game states if not present
if (typeof GAME_STATES !== 'undefined' && !GAME_STATES.UPGRADE) {
    GAME_STATES.UPGRADE = 'upgrade';
}

console.log('[UpgradeUI] Equipment upgrade UI loaded');
