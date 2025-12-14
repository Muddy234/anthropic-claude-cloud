// === js/ui/crafting-ui.js ===
// SURVIVAL EXTRACTION UPDATE: Crafting interface

// ============================================================================
// CRAFTING UI
// ============================================================================

const CraftingUI = {

    // UI State
    isOpen: false,
    selectedCategory: 'weapons',
    selectedRecipe: null,
    recipeList: [],
    listOffset: 0,
    craftCount: 1,
    showingDetail: false,

    // Animation
    animationProgress: 0,
    craftingAnimation: null,

    // Layout
    panelWidth: 700,
    panelHeight: 500,
    listItemHeight: 36,
    visibleListItems: 10,

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Open crafting UI
     */
    open() {
        this.isOpen = true;
        this.selectedCategory = 'weapons';
        this.selectedRecipe = null;
        this.listOffset = 0;
        this.craftCount = 1;
        this.showingDetail = false;
        this.animationProgress = 0;

        this._refreshRecipeList();

        console.log('[CraftingUI] Opened');
    },

    /**
     * Close crafting UI
     */
    close() {
        this.isOpen = false;
        this.selectedRecipe = null;

        console.log('[CraftingUI] Closed');
    },

    /**
     * Toggle UI
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    // ========================================================================
    // INPUT HANDLING
    // ========================================================================

    /**
     * Handle input
     * @param {string} key
     * @returns {boolean} - Whether input was consumed
     */
    handleInput(key) {
        if (!this.isOpen) return false;

        switch (key.toLowerCase()) {
            case 'escape':
                if (this.showingDetail) {
                    this.showingDetail = false;
                } else {
                    this.close();
                }
                return true;

            case 'tab':
                this._cycleCategory(1);
                return true;

            case 'arrowup':
            case 'w':
                this._moveSelection(-1);
                return true;

            case 'arrowdown':
            case 's':
                this._moveSelection(1);
                return true;

            case 'arrowleft':
            case 'a':
                if (this.showingDetail) {
                    this._adjustCraftCount(-1);
                } else {
                    this._cycleCategory(-1);
                }
                return true;

            case 'arrowright':
            case 'd':
                if (this.showingDetail) {
                    this._adjustCraftCount(1);
                } else {
                    this._cycleCategory(1);
                }
                return true;

            case 'enter':
            case ' ':
                if (this.showingDetail) {
                    this._craftSelected();
                } else if (this.selectedRecipe) {
                    this.showingDetail = true;
                }
                return true;

            case 'f':
                if (this.selectedRecipe) {
                    CraftingSystem.toggleFavorite(this.selectedRecipe.id);
                    this._refreshRecipeList();
                }
                return true;

            default:
                // Number keys for quick category select
                const num = parseInt(key);
                if (num >= 1 && num <= 5) {
                    const categories = Object.keys(CRAFT_CATEGORIES);
                    if (categories[num - 1]) {
                        this.selectedCategory = categories[num - 1];
                        this._refreshRecipeList();
                    }
                    return true;
                }
        }

        return false;
    },

    /**
     * Cycle through categories
     * @param {number} direction
     * @private
     */
    _cycleCategory(direction) {
        const categories = Object.keys(CRAFT_CATEGORIES);
        const currentIndex = categories.indexOf(this.selectedCategory);
        const newIndex = (currentIndex + direction + categories.length) % categories.length;

        this.selectedCategory = categories[newIndex];
        this._refreshRecipeList();
    },

    /**
     * Move selection in recipe list
     * @param {number} direction
     * @private
     */
    _moveSelection(direction) {
        if (this.recipeList.length === 0) return;

        const currentIndex = this.selectedRecipe ?
            this.recipeList.findIndex(r => r.id === this.selectedRecipe.id) : -1;

        let newIndex = currentIndex + direction;
        newIndex = Math.max(0, Math.min(this.recipeList.length - 1, newIndex));

        this.selectedRecipe = this.recipeList[newIndex];

        // Scroll if needed
        if (newIndex < this.listOffset) {
            this.listOffset = newIndex;
        } else if (newIndex >= this.listOffset + this.visibleListItems) {
            this.listOffset = newIndex - this.visibleListItems + 1;
        }

        // Reset craft count for new selection
        this.craftCount = 1;
    },

    /**
     * Adjust craft count for batch crafting
     * @param {number} direction
     * @private
     */
    _adjustCraftCount(direction) {
        if (!this.selectedRecipe) return;

        const recipe = this.selectedRecipe;
        const maxBatch = recipe.batchCraft ? recipe.maxBatch : 1;

        this.craftCount = Math.max(1, Math.min(maxBatch, this.craftCount + direction));
    },

    /**
     * Craft selected recipe
     * @private
     */
    _craftSelected() {
        if (!this.selectedRecipe) return;

        const result = CraftingSystem.startCrafting(this.selectedRecipe.id, this.craftCount);

        if (result.success) {
            this.craftingAnimation = {
                recipeId: this.selectedRecipe.id,
                startTime: Date.now(),
                duration: result.duration
            };
            this.craftCount = 1;
            this._refreshRecipeList();
        } else {
            // Show error
            if (typeof addMessage === 'function') {
                addMessage(`Cannot craft: ${result.error}`, 'warning');
            }
        }
    },

    /**
     * Refresh recipe list for current category
     * @private
     */
    _refreshRecipeList() {
        this.recipeList = CraftingSystem.getRecipesByCategory(this.selectedCategory);

        // Sort: favorites first, then by tier
        this.recipeList.sort((a, b) => {
            const aFav = CraftingSystem.isFavorite(a.id) ? 0 : 1;
            const bFav = CraftingSystem.isFavorite(b.id) ? 0 : 1;
            if (aFav !== bFav) return aFav - bFav;
            return (a.tier || 1) - (b.tier || 1);
        });

        // Select first if none selected
        if (!this.selectedRecipe || !this.recipeList.find(r => r.id === this.selectedRecipe.id)) {
            this.selectedRecipe = this.recipeList[0] || null;
        }

        this.listOffset = 0;
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render crafting UI
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    render(ctx, canvasWidth, canvasHeight) {
        if (!this.isOpen) return;

        // Animate opening
        this.animationProgress = Math.min(1, this.animationProgress + 0.1);
        const scale = 0.8 + this.animationProgress * 0.2;
        const alpha = this.animationProgress;

        // Backdrop
        ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * alpha})`;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Panel position
        const panelX = (canvasWidth - this.panelWidth * scale) / 2;
        const panelY = (canvasHeight - this.panelHeight * scale) / 2;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(panelX, panelY);
        ctx.scale(scale, scale);

        // Main panel
        this._renderPanel(ctx);

        // Category tabs
        this._renderCategoryTabs(ctx);

        // Recipe list
        this._renderRecipeList(ctx);

        // Detail panel
        if (this.showingDetail && this.selectedRecipe) {
            this._renderDetailPanel(ctx);
        } else if (this.selectedRecipe) {
            this._renderPreview(ctx);
        }

        // Crafting queue
        this._renderQueue(ctx);

        ctx.restore();
    },

    /**
     * Render main panel background
     * @param {CanvasRenderingContext2D} ctx
     * @private
     */
    _renderPanel(ctx) {
        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.panelWidth, this.panelHeight);

        // Border
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, this.panelWidth, this.panelHeight);

        // Title
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚒️ CRAFTING ⚒️', this.panelWidth / 2, 30);

        // Gold display
        const gold = persistentState?.bank?.gold || 0;
        ctx.font = '14px monospace';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'right';
        ctx.fillText(`💰 ${gold} gold`, this.panelWidth - 15, 30);

        // Instructions
        ctx.fillStyle = '#888';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('[Tab] Category  [Enter] Select  [F] Favorite  [Esc] Close', this.panelWidth / 2, this.panelHeight - 10);
    },

    /**
     * Render category tabs
     * @param {CanvasRenderingContext2D} ctx
     * @private
     */
    _renderCategoryTabs(ctx) {
        const categories = Object.values(CRAFT_CATEGORIES);
        const tabWidth = 120;
        const tabHeight = 32;
        const startX = 20;
        const startY = 45;

        categories.forEach((cat, i) => {
            const x = startX + i * (tabWidth + 5);
            const isSelected = cat.id === this.selectedCategory;

            // Tab background
            ctx.fillStyle = isSelected ? '#3a3a5a' : '#252540';
            ctx.fillRect(x, startY, tabWidth, tabHeight);

            // Tab border
            ctx.strokeStyle = isSelected ? '#6a6aaa' : '#3a3a5a';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, startY, tabWidth, tabHeight);

            // Tab text
            ctx.fillStyle = isSelected ? '#fff' : '#888';
            ctx.font = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${cat.icon} ${cat.name}`, x + tabWidth / 2, startY + 21);

            // Number hint
            ctx.fillStyle = '#555';
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`[${i + 1}]`, x + 3, startY + 12);
        });
    },

    /**
     * Render recipe list
     * @param {CanvasRenderingContext2D} ctx
     * @private
     */
    _renderRecipeList(ctx) {
        const listX = 20;
        const listY = 90;
        const listWidth = 280;
        const listHeight = this.visibleListItems * this.listItemHeight;

        // Background
        ctx.fillStyle = '#151525';
        ctx.fillRect(listX, listY, listWidth, listHeight);

        // Border
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 1;
        ctx.strokeRect(listX, listY, listWidth, listHeight);

        // Recipes
        const visibleRecipes = this.recipeList.slice(this.listOffset, this.listOffset + this.visibleListItems);

        visibleRecipes.forEach((recipe, i) => {
            const y = listY + i * this.listItemHeight;
            const isSelected = this.selectedRecipe?.id === recipe.id;
            const canCraft = CraftingSystem.canCraft(recipe.id).canCraft;
            const isFavorite = CraftingSystem.isFavorite(recipe.id);

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = '#3a3a6a';
                ctx.fillRect(listX + 2, y + 2, listWidth - 4, this.listItemHeight - 4);
            }

            // Favorite star
            if (isFavorite) {
                ctx.fillStyle = '#ffd700';
                ctx.font = '12px monospace';
                ctx.textAlign = 'left';
                ctx.fillText('★', listX + 8, y + 23);
            }

            // Recipe name
            ctx.fillStyle = canCraft ? '#fff' : '#666';
            ctx.font = '13px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(recipe.name, listX + (isFavorite ? 25 : 12), y + 23);

            // Tier indicator
            const tierColors = ['#888', '#4a9', '#49e', '#94e', '#e4e', '#fa4'];
            ctx.fillStyle = tierColors[recipe.tier - 1] || '#888';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`T${recipe.tier}`, listX + listWidth - 10, y + 23);
        });

        // Scroll indicator
        if (this.recipeList.length > this.visibleListItems) {
            const scrollHeight = listHeight * (this.visibleListItems / this.recipeList.length);
            const scrollY = listY + (listHeight - scrollHeight) * (this.listOffset / (this.recipeList.length - this.visibleListItems));

            ctx.fillStyle = '#4a4a6a';
            ctx.fillRect(listX + listWidth - 6, scrollY, 4, scrollHeight);
        }

        // Empty list message
        if (this.recipeList.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('No recipes available', listX + listWidth / 2, listY + listHeight / 2);
        }
    },

    /**
     * Render recipe preview (when not in detail view)
     * @param {CanvasRenderingContext2D} ctx
     * @private
     */
    _renderPreview(ctx) {
        const detail = CraftingSystem.getRecipeDetail(this.selectedRecipe.id);
        if (!detail) return;

        const previewX = 320;
        const previewY = 90;
        const previewWidth = 360;
        const previewHeight = 300;

        // Background
        ctx.fillStyle = '#1f1f35';
        ctx.fillRect(previewX, previewY, previewWidth, previewHeight);

        // Border
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 1;
        ctx.strokeRect(previewX, previewY, previewWidth, previewHeight);

        // Recipe name
        const rarityColors = {
            common: '#888',
            uncommon: '#4a9',
            rare: '#49e',
            epic: '#94e',
            legendary: '#fa4'
        };
        ctx.fillStyle = rarityColors[detail.result.rarity] || '#fff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(detail.name, previewX + previewWidth / 2, previewY + 30);

        // Description
        ctx.fillStyle = '#aaa';
        ctx.font = '12px monospace';
        ctx.fillText(detail.description, previewX + previewWidth / 2, previewY + 52);

        // Materials header
        ctx.fillStyle = '#888';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('MATERIALS:', previewX + 15, previewY + 85);

        // Materials list
        detail.materials.forEach((mat, i) => {
            const y = previewY + 105 + i * 22;
            ctx.fillStyle = mat.enough ? '#4a9' : '#e44';
            ctx.font = '12px monospace';
            ctx.fillText(`${mat.icon} ${mat.name}`, previewX + 20, y);

            ctx.textAlign = 'right';
            ctx.fillText(`${mat.have}/${mat.required}`, previewX + previewWidth - 20, y);
            ctx.textAlign = 'left';
        });

        // Gold cost
        const goldY = previewY + 115 + detail.materials.length * 22;
        ctx.fillStyle = detail.canAffordGold ? '#ffd700' : '#e44';
        ctx.font = '12px monospace';
        ctx.fillText(`💰 Gold: ${detail.currentGold}/${detail.goldCost}`, previewX + 20, goldY);

        // Result stats
        const statsY = goldY + 35;
        ctx.fillStyle = '#888';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('RESULT:', previewX + 15, statsY);

        let statLine = 0;
        const result = detail.result;

        if (result.damage) {
            ctx.fillStyle = '#e44';
            ctx.font = '12px monospace';
            ctx.fillText(`⚔️ Damage: ${result.damage}`, previewX + 20, statsY + 20 + statLine * 18);
            statLine++;
        }
        if (result.defense) {
            ctx.fillStyle = '#4ae';
            ctx.fillText(`🛡️ Defense: ${result.defense}`, previewX + 20, statsY + 20 + statLine * 18);
            statLine++;
        }
        if (result.attackSpeed) {
            ctx.fillStyle = '#8a8';
            ctx.fillText(`⚡ Attack Speed: ${result.attackSpeed}`, previewX + 20, statsY + 20 + statLine * 18);
            statLine++;
        }

        // Craft prompt
        const canCraft = CraftingSystem.canCraft(detail.id).canCraft;
        ctx.fillStyle = canCraft ? '#4a9' : '#666';
        ctx.font = '13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(canCraft ? '[Enter] View Details / Craft' : 'Missing materials',
            previewX + previewWidth / 2, previewY + previewHeight - 20);
    },

    /**
     * Render detailed crafting panel
     * @param {CanvasRenderingContext2D} ctx
     * @private
     */
    _renderDetailPanel(ctx) {
        const detail = CraftingSystem.getRecipeDetail(this.selectedRecipe.id);
        if (!detail) return;

        const panelX = 320;
        const panelY = 90;
        const panelWidth = 360;
        const panelHeight = 300;

        // Background with highlight
        ctx.fillStyle = '#252545';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

        // Border
        ctx.strokeStyle = '#6a6aaa';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        // Title
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`CRAFT: ${detail.name}`, panelX + panelWidth / 2, panelY + 30);

        // Batch crafting (if available)
        if (detail.batchCraft) {
            ctx.fillStyle = '#aaa';
            ctx.font = '14px monospace';
            ctx.fillText(`Quantity: ${this.craftCount}`, panelX + panelWidth / 2, panelY + 55);
            ctx.fillStyle = '#666';
            ctx.font = '11px monospace';
            ctx.fillText('[←/→] Adjust  (Max: ' + detail.maxBatch + ')', panelX + panelWidth / 2, panelY + 72);
        }

        // Cost summary
        const costY = panelY + (detail.batchCraft ? 95 : 70);
        ctx.fillStyle = '#888';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('TOTAL COST:', panelX + 15, costY);

        // Material costs
        detail.materials.forEach((mat, i) => {
            const y = costY + 20 + i * 20;
            const totalNeed = mat.required * this.craftCount;
            const enough = mat.have >= totalNeed;

            ctx.fillStyle = enough ? '#4a9' : '#e44';
            ctx.font = '12px monospace';
            ctx.fillText(`${mat.icon} ${mat.name}`, panelX + 20, y);

            ctx.textAlign = 'right';
            ctx.fillText(`${mat.have}/${totalNeed}`, panelX + panelWidth - 20, y);
            ctx.textAlign = 'left';
        });

        // Gold cost
        const goldY = costY + 25 + detail.materials.length * 20;
        const totalGold = detail.goldCost * this.craftCount;
        ctx.fillStyle = detail.currentGold >= totalGold ? '#ffd700' : '#e44';
        ctx.font = '12px monospace';
        ctx.fillText(`💰 Gold: ${detail.currentGold}/${totalGold}`, panelX + 20, goldY);

        // Time
        const timeY = goldY + 25;
        const totalTime = detail.craftTime * this.craftCount;
        ctx.fillStyle = '#8af';
        ctx.fillText(`⏱️ Time: ${totalTime}s`, panelX + 20, timeY);

        // Craft button
        const canCraft = CraftingSystem.canCraft(detail.id, this.craftCount).canCraft;
        const buttonY = panelY + panelHeight - 50;

        ctx.fillStyle = canCraft ? '#2a5a2a' : '#3a2a2a';
        ctx.fillRect(panelX + 50, buttonY, panelWidth - 100, 35);

        ctx.strokeStyle = canCraft ? '#4a9a4a' : '#6a3a3a';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX + 50, buttonY, panelWidth - 100, 35);

        ctx.fillStyle = canCraft ? '#8f8' : '#866';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(canCraft ? '[Enter] CRAFT' : 'Cannot Craft',
            panelX + panelWidth / 2, buttonY + 23);

        // Back hint
        ctx.fillStyle = '#666';
        ctx.font = '11px monospace';
        ctx.fillText('[Esc] Back', panelX + panelWidth / 2, panelY + panelHeight - 8);
    },

    /**
     * Render crafting queue
     * @param {CanvasRenderingContext2D} ctx
     * @private
     */
    _renderQueue(ctx) {
        const queue = CraftingSystem.getQueueStatus();
        if (queue.length === 0) return;

        const queueX = 20;
        const queueY = this.panelHeight - 75;
        const queueWidth = 280;

        ctx.fillStyle = '#888';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('CRAFTING QUEUE:', queueX, queueY);

        queue.forEach((job, i) => {
            const y = queueY + 15 + i * 18;

            // Name
            ctx.fillStyle = '#aaa';
            ctx.font = '11px monospace';
            ctx.fillText(`${job.count}x ${job.name}`, queueX + 5, y);

            // Progress bar
            const barX = queueX + 150;
            const barWidth = 80;
            const barHeight = 10;

            ctx.fillStyle = '#252540';
            ctx.fillRect(barX, y - 9, barWidth, barHeight);

            ctx.fillStyle = '#4a9';
            ctx.fillRect(barX, y - 9, barWidth * job.progress, barHeight);

            ctx.strokeStyle = '#4a4a6a';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, y - 9, barWidth, barHeight);

            // Time remaining
            ctx.fillStyle = '#888';
            ctx.textAlign = 'right';
            ctx.fillText(`${job.remainingSeconds}s`, queueX + queueWidth - 5, y);
            ctx.textAlign = 'left';
        });
    }
};

// ============================================================================
// KEYBOARD HOOK
// ============================================================================

window.addEventListener('keydown', (e) => {
    if (game.state === 'crafting' || game.state === GAME_STATES?.CRAFTING) {
        if (CraftingUI.handleInput(e.key)) {
            e.preventDefault();
        }
    }
});

// ============================================================================
// EXPORTS
// ============================================================================

window.CraftingUI = CraftingUI;

console.log('[CraftingUI] Crafting UI loaded');
