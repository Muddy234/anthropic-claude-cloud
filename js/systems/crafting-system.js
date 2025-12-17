// === js/systems/crafting-system.js ===
// SURVIVAL EXTRACTION UPDATE: Crafting logic and management

// ============================================================================
// CRAFTING SYSTEM
// ============================================================================

const CraftingSystem = {
    name: 'CraftingSystem',
    priority: 88,

    // Active crafting queue
    craftingQueue: [],
    maxQueueSize: 3,

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize crafting system
     */
    init() {
        // Initialize persistent crafting data
        if (typeof persistentState !== 'undefined') {
            if (!persistentState.crafting) {
                persistentState.crafting = {
                    unlockedRecipes: [],
                    craftedItems: {},
                    craftedUniques: [],
                    totalCrafted: 0,
                    favoriteRecipes: []
                };
            }

            // Initialize guardian tracking if not exists
            if (!persistentState.guardiansDefeated) {
                persistentState.guardiansDefeated = [];
            }
        }

        this.craftingQueue = [];
        console.log('[CraftingSystem] Initialized');
    },

    // ========================================================================
    // RECIPE MANAGEMENT
    // ========================================================================

    /**
     * Get all recipes available to player
     * @returns {Array}
     */
    getAvailableRecipes() {
        const playerData = {
            guardiansDefeated: persistentState?.guardiansDefeated || [],
            coreDefeated: persistentState?.coreDefeated || false,
            craftedUniques: persistentState?.crafting?.craftedUniques || []
        };

        return getAvailableRecipes(playerData);
    },

    /**
     * Get recipes by category
     * @param {string} category
     * @returns {Array}
     */
    getRecipesByCategory(category) {
        const available = this.getAvailableRecipes();
        return available.filter(r => r.category === category);
    },

    /**
     * Check if recipe is unlocked
     * @param {string} recipeId
     * @returns {boolean}
     */
    isRecipeUnlocked(recipeId) {
        const available = this.getAvailableRecipes();
        return available.some(r => r.id === recipeId);
    },

    /**
     * Unlock a recipe manually (for quest rewards, etc.)
     * @param {string} recipeId
     */
    unlockRecipe(recipeId) {
        if (!persistentState?.crafting) return;

        if (!persistentState.crafting.unlockedRecipes.includes(recipeId)) {
            persistentState.crafting.unlockedRecipes.push(recipeId);
            console.log(`[CraftingSystem] Unlocked recipe: ${recipeId}`);

            if (typeof addMessage === 'function') {
                const recipe = getRecipe(recipeId);
                addMessage(`New recipe unlocked: ${recipe?.name || recipeId}`, 'success');
            }
        }
    },

    // ========================================================================
    // CRAFTING OPERATIONS
    // ========================================================================

    /**
     * Check if player can craft a recipe
     * @param {string} recipeId
     * @param {number} count - Number to craft (for batch crafting)
     * @returns {Object} { canCraft, missingMaterials, missingGold }
     */
    canCraft(recipeId, count = 1) {
        const recipe = getRecipe(recipeId);
        if (!recipe) return { canCraft: false, reason: 'Unknown recipe' };

        // Check if recipe is available
        if (!this.isRecipeUnlocked(recipeId)) {
            return { canCraft: false, reason: 'Recipe not unlocked' };
        }

        // Check if unique and already crafted
        if (recipe.unique && persistentState?.crafting?.craftedUniques?.includes(recipeId)) {
            return { canCraft: false, reason: 'Unique item already crafted' };
        }

        // Check batch limits
        if (count > 1 && (!recipe.batchCraft || count > recipe.maxBatch)) {
            return { canCraft: false, reason: 'Cannot batch craft this recipe' };
        }

        // Check queue space
        if (this.craftingQueue.length >= this.maxQueueSize) {
            return { canCraft: false, reason: 'Crafting queue is full' };
        }

        // Get materials from bank
        const materialInventory = {};
        if (typeof BankingSystem !== 'undefined') {
            recipe.materials.forEach(mat => {
                materialInventory[mat.id] = BankingSystem.getItemCount(mat.id);
            });
        }

        // Calculate total cost for batch
        const totalGold = recipe.goldCost * count;
        const bankGold = persistentState?.bank?.gold || 0;

        const missingMaterials = [];
        recipe.materials.forEach(mat => {
            const need = mat.count * count;
            const have = materialInventory[mat.id] || 0;
            if (have < need) {
                missingMaterials.push({
                    id: mat.id,
                    need: need,
                    have: have,
                    missing: need - have
                });
            }
        });

        const missingGold = Math.max(0, totalGold - bankGold);

        return {
            canCraft: missingMaterials.length === 0 && missingGold === 0,
            missingMaterials,
            missingGold,
            totalCost: totalGold
        };
    },

    /**
     * Start crafting a recipe
     * @param {string} recipeId
     * @param {number} count - Number to craft
     * @returns {Object} { success, craftId, error }
     */
    startCrafting(recipeId, count = 1) {
        const canCraftResult = this.canCraft(recipeId, count);
        if (!canCraftResult.canCraft) {
            return { success: false, error: canCraftResult.reason || 'Cannot craft' };
        }

        const recipe = getRecipe(recipeId);

        // Consume materials
        recipe.materials.forEach(mat => {
            const totalCount = mat.count * count;
            if (typeof BankingSystem !== 'undefined') {
                BankingSystem.removeItem(mat.id, totalCount);
            }
        });

        // Consume gold
        const totalGold = recipe.goldCost * count;
        if (typeof BankingSystem !== 'undefined' && totalGold > 0) {
            BankingSystem.withdrawGold(totalGold);
        }

        // Add to queue
        const craftId = `craft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const craftJob = {
            id: craftId,
            recipeId: recipeId,
            count: count,
            startTime: Date.now(),
            duration: recipe.craftTime * 1000 * count,
            progress: 0,
            completed: false
        };

        this.craftingQueue.push(craftJob);

        console.log(`[CraftingSystem] Started crafting ${count}x ${recipe.name}`);

        return { success: true, craftId, duration: craftJob.duration };
    },

    /**
     * Cancel a crafting job (returns partial materials)
     * @param {string} craftId
     * @returns {Object} { success, refund }
     */
    cancelCrafting(craftId) {
        const jobIndex = this.craftingQueue.findIndex(j => j.id === craftId);
        if (jobIndex === -1) {
            return { success: false, error: 'Craft job not found' };
        }

        const job = this.craftingQueue[jobIndex];
        const recipe = getRecipe(job.recipeId);

        // Calculate refund (50% of materials, no gold)
        const refund = {
            materials: [],
            gold: 0
        };

        recipe.materials.forEach(mat => {
            const refundCount = Math.floor(mat.count * job.count * 0.5);
            if (refundCount > 0) {
                refund.materials.push({ id: mat.id, count: refundCount });
                if (typeof BankingSystem !== 'undefined') {
                    const item = typeof createMaterialItem === 'function' ?
                        createMaterialItem(mat.id, refundCount) :
                        { id: mat.id, count: refundCount };
                    BankingSystem.deposit(item);
                }
            }
        });

        // Remove from queue
        this.craftingQueue.splice(jobIndex, 1);

        console.log(`[CraftingSystem] Cancelled crafting ${recipe.name}`);

        return { success: true, refund };
    },

    /**
     * Complete a crafting job
     * @param {string} craftId
     * @returns {Object} { success, items }
     * @private
     */
    _completeCrafting(craftId) {
        const jobIndex = this.craftingQueue.findIndex(j => j.id === craftId);
        if (jobIndex === -1) return { success: false };

        const job = this.craftingQueue[jobIndex];
        const recipe = getRecipe(job.recipeId);

        // Create result items
        const items = [];
        for (let i = 0; i < job.count; i++) {
            const item = this._createCraftedItem(recipe);
            items.push(item);

            // Add to bank
            if (typeof BankingSystem !== 'undefined') {
                BankingSystem.deposit(item);
            }
        }

        // Update crafting stats
        if (persistentState?.crafting) {
            persistentState.crafting.totalCrafted += job.count;
            persistentState.crafting.craftedItems[job.recipeId] =
                (persistentState.crafting.craftedItems[job.recipeId] || 0) + job.count;

            // Track unique crafts
            if (recipe.unique) {
                persistentState.crafting.craftedUniques.push(job.recipeId);
            }
        }

        // Remove from queue
        this.craftingQueue.splice(jobIndex, 1);

        console.log(`[CraftingSystem] Completed crafting ${job.count}x ${recipe.name}`);

        if (typeof addMessage === 'function') {
            addMessage(`Crafted ${job.count}x ${recipe.name}!`, 'success');
        }

        return { success: true, items };
    },

    /**
     * Create a crafted item from recipe result
     * @param {Object} recipe
     * @returns {Object}
     * @private
     */
    _createCraftedItem(recipe) {
        const result = { ...recipe.result };
        result.id = recipe.id;
        result.crafted = true;
        result.craftDate = Date.now();

        // Add quality variation (small random bonus)
        const qualityRoll = Math.random();
        if (qualityRoll > 0.95) {
            result.quality = 'masterwork';
            result.name = `Masterwork ${result.name}`;
            if (result.damage) result.damage = Math.floor(result.damage * 1.15);
            if (result.defense) result.defense = Math.floor(result.defense * 1.15);
        } else if (qualityRoll > 0.8) {
            result.quality = 'superior';
            result.name = `Superior ${result.name}`;
            if (result.damage) result.damage = Math.floor(result.damage * 1.08);
            if (result.defense) result.defense = Math.floor(result.defense * 1.08);
        } else {
            result.quality = 'standard';
        }

        return result;
    },

    // ========================================================================
    // UPGRADE SYSTEM
    // ========================================================================

    /**
     * Apply upgrade to equipment
     * @param {string} upgradeRecipeId - Upgrade recipe to use
     * @param {Object} equipment - Equipment to upgrade
     * @returns {Object} { success, upgradedEquipment }
     */
    applyUpgrade(upgradeRecipeId, equipment) {
        const recipe = getRecipe(upgradeRecipeId);
        if (!recipe || recipe.result.type !== 'upgrade') {
            return { success: false, error: 'Invalid upgrade' };
        }

        // Check if equipment matches upgrade type
        if (recipe.result.upgradeType === 'weapon' && equipment.type !== 'weapon') {
            return { success: false, error: 'Upgrade is for weapons only' };
        }
        if (recipe.result.upgradeType === 'armor' && equipment.type !== 'armor') {
            return { success: false, error: 'Upgrade is for armor only' };
        }

        // Apply upgrade effect
        const upgraded = { ...equipment };
        upgraded.upgrades = upgraded.upgrades || [];

        switch (recipe.result.effect) {
            case 'damage_percent':
                upgraded.damage = Math.floor(upgraded.damage * (1 + recipe.result.value));
                break;
            case 'defense_percent':
                upgraded.defense = Math.floor(upgraded.defense * (1 + recipe.result.value));
                break;
            case 'elemental_random':
                const elements = ['fire', 'ice', 'lightning', 'shadow'];
                const element = elements[Math.floor(Math.random() * elements.length)];
                upgraded[`${element}Damage`] = (upgraded[`${element}Damage`] || 0) + recipe.result.value;
                break;
        }

        upgraded.upgrades.push({
            id: upgradeRecipeId,
            name: recipe.name,
            appliedAt: Date.now()
        });

        console.log(`[CraftingSystem] Applied ${recipe.name} to ${equipment.name}`);

        return { success: true, upgradedEquipment: upgraded };
    },

    // ========================================================================
    // FAVORITES
    // ========================================================================

    /**
     * Toggle recipe as favorite
     * @param {string} recipeId
     */
    toggleFavorite(recipeId) {
        if (!persistentState?.crafting) return;

        const favorites = persistentState.crafting.favoriteRecipes;
        const index = favorites.indexOf(recipeId);

        if (index >= 0) {
            favorites.splice(index, 1);
        } else {
            favorites.push(recipeId);
        }
    },

    /**
     * Check if recipe is favorited
     * @param {string} recipeId
     * @returns {boolean}
     */
    isFavorite(recipeId) {
        return persistentState?.crafting?.favoriteRecipes?.includes(recipeId) || false;
    },

    /**
     * Get favorite recipes
     * @returns {Array}
     */
    getFavorites() {
        const favoriteIds = persistentState?.crafting?.favoriteRecipes || [];
        return favoriteIds.map(id => getRecipe(id)).filter(Boolean);
    },

    // ========================================================================
    // SYSTEM UPDATE
    // ========================================================================

    /**
     * Update crafting queue
     * @param {number} dt - Delta time
     */
    update(dt) {
        const now = Date.now();

        // Update queue progress
        this.craftingQueue.forEach(job => {
            const elapsed = now - job.startTime;
            job.progress = Math.min(1, elapsed / job.duration);

            // Check for completion
            if (job.progress >= 1 && !job.completed) {
                job.completed = true;
                this._completeCrafting(job.id);
            }
        });
    },

    // ========================================================================
    // QUERIES
    // ========================================================================

    /**
     * Get crafting queue status
     * @returns {Array}
     */
    getQueueStatus() {
        return this.craftingQueue.map(job => {
            const recipe = getRecipe(job.recipeId);
            const remaining = Math.max(0, job.duration - (Date.now() - job.startTime));

            return {
                id: job.id,
                recipeId: job.recipeId,
                name: recipe?.name || 'Unknown',
                count: job.count,
                progress: job.progress,
                remainingMs: remaining,
                remainingSeconds: Math.ceil(remaining / 1000),
                completed: job.completed
            };
        });
    },

    /**
     * Get crafting statistics
     * @returns {Object}
     */
    getStats() {
        const crafting = persistentState?.crafting || {};

        return {
            totalCrafted: crafting.totalCrafted || 0,
            craftedItems: crafting.craftedItems || {},
            uniquesCrafted: crafting.craftedUniques?.length || 0,
            recipesUnlocked: this.getAvailableRecipes().length,
            queueSize: this.craftingQueue.length,
            maxQueueSize: this.maxQueueSize
        };
    },

    /**
     * Get recipe detail with player's material counts
     * @param {string} recipeId
     * @returns {Object}
     */
    getRecipeDetail(recipeId) {
        const recipe = getRecipe(recipeId);
        if (!recipe) return null;

        const materials = recipe.materials.map(mat => {
            const have = typeof BankingSystem !== 'undefined' ?
                BankingSystem.getItemCount(mat.id) : 0;
            const material = typeof getMaterial === 'function' ? getMaterial(mat.id) : null;

            return {
                id: mat.id,
                name: material?.name || mat.id,
                icon: material?.icon || '?',
                tier: material?.tier || 1,
                required: mat.count,
                have: have,
                enough: have >= mat.count
            };
        });

        const bankGold = persistentState?.bank?.gold || 0;

        return {
            ...recipe,
            materials,
            canAffordGold: bankGold >= recipe.goldCost,
            currentGold: bankGold,
            timesCrafted: persistentState?.crafting?.craftedItems?.[recipeId] || 0,
            isFavorite: this.isFavorite(recipeId)
        };
    }
};

// ============================================================================
// REGISTER WITH SYSTEM MANAGER
// ============================================================================

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('CraftingSystem', CraftingSystem, 88);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.CraftingSystem = CraftingSystem;

console.log('[CraftingSystem] Crafting system loaded');
