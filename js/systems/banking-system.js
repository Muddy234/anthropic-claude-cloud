// === js/systems/banking-system.js ===
// SURVIVAL EXTRACTION UPDATE: Bank storage and management

// ============================================================================
// BANKING SYSTEM
// ============================================================================

const BankingSystem = {

    // ========================================================================
    // DEPOSIT OPERATIONS
    // ========================================================================

    /**
     * Deposit an item to the bank
     * @param {Object} item - Item to deposit
     * @returns {boolean} Success
     */
    deposit(item) {
        if (!item) return false;

        // Check for stackable items (materials, consumables)
        if (item.stackable || item.type === 'material' || item.type === 'consumable') {
            const existing = persistentState.bank.items.find(i => i.id === item.id);
            if (existing) {
                existing.count = (existing.count || 1) + (item.count || 1);
                console.log(`[BankingSystem] Stacked ${item.name} (now ${existing.count})`);
                return true;
            }
        }

        // Add new item (unlimited storage)
        persistentState.bank.items.push({ ...item, count: item.count || 1 });
        persistentState.bank.usedSlots++;

        console.log(`[BankingSystem] Deposited ${item.name}`);
        return true;
    },

    /**
     * Deposit multiple items
     * @param {Array} items - Items to deposit
     * @returns {number} Number of items deposited
     */
    depositAll(items) {
        let deposited = 0;
        items.forEach(item => {
            if (this.deposit(item)) deposited++;
        });
        return deposited;
    },

    /**
     * Deposit gold to the bank
     * @param {number} amount - Gold amount
     */
    depositGold(amount) {
        if (amount <= 0) return;
        persistentState.bank.gold += amount;
        console.log(`[BankingSystem] Deposited ${amount} gold (total: ${persistentState.bank.gold})`);
    },

    // ========================================================================
    // WITHDRAW OPERATIONS
    // ========================================================================

    /**
     * Withdraw an item from the bank by index
     * @param {number} index - Index in bank items array
     * @param {number} count - Amount to withdraw (for stackables)
     * @returns {Object|null} Withdrawn item
     */
    withdraw(index, count = 1) {
        if (index < 0 || index >= persistentState.bank.items.length) {
            return null;
        }

        const item = persistentState.bank.items[index];

        // Handle stackable items
        if ((item.stackable || item.type === 'material' || item.type === 'consumable') && item.count > 1) {
            const withdrawCount = Math.min(count, item.count);
            item.count -= withdrawCount;

            const withdrawn = { ...item, count: withdrawCount };

            // Remove if depleted
            if (item.count <= 0) {
                persistentState.bank.items.splice(index, 1);
                persistentState.bank.usedSlots--;
            }

            console.log(`[BankingSystem] Withdrew ${withdrawCount}x ${item.name}`);
            return withdrawn;
        }

        // Non-stackable: remove entirely
        const withdrawn = persistentState.bank.items.splice(index, 1)[0];
        persistentState.bank.usedSlots--;

        console.log(`[BankingSystem] Withdrew ${withdrawn.name}`);
        return withdrawn;
    },

    /**
     * Withdraw an item by ID
     * @param {string} itemId - Item ID to withdraw
     * @param {number} count - Amount for stackables
     * @returns {Object|null} Withdrawn item
     */
    withdrawById(itemId, count = 1) {
        const index = persistentState.bank.items.findIndex(i => i.id === itemId);
        if (index === -1) return null;
        return this.withdraw(index, count);
    },

    /**
     * Withdraw gold from the bank
     * @param {number} amount - Gold amount
     * @returns {boolean} Success
     */
    withdrawGold(amount) {
        if (amount <= 0) return true;
        if (amount > persistentState.bank.gold) {
            console.warn('[BankingSystem] Not enough gold!');
            return false;
        }

        persistentState.bank.gold -= amount;
        console.log(`[BankingSystem] Withdrew ${amount} gold (remaining: ${persistentState.bank.gold})`);
        return true;
    },

    // ========================================================================
    // QUERY OPERATIONS
    // ========================================================================

    /**
     * Get bank contents
     * @returns {Object} Bank state
     */
    getContents() {
        return {
            gold: persistentState.bank.gold,
            items: [...persistentState.bank.items],
            usedSlots: persistentState.bank.usedSlots,
            maxSlots: Infinity  // Unlimited storage
        };
    },

    /**
     * Get gold amount
     * @returns {number}
     */
    getGold() {
        return persistentState.bank.gold;
    },

    /**
     * Check if bank has an item
     * @param {string} itemId - Item ID
     * @param {number} count - Required count
     * @returns {boolean}
     */
    hasItem(itemId, count = 1) {
        const item = persistentState.bank.items.find(i => i.id === itemId);
        return item && (item.count || 1) >= count;
    },

    /**
     * Get item count in bank
     * @param {string} itemId - Item ID
     * @returns {number}
     */
    getItemCount(itemId) {
        const item = persistentState.bank.items.find(i => i.id === itemId);
        return item ? (item.count || 1) : 0;
    },

    /**
     * Check if bank has enough gold
     * @param {number} amount
     * @returns {boolean}
     */
    hasGold(amount) {
        return persistentState.bank.gold >= amount;
    },

    /**
     * Get available storage slots
     * @returns {number}
     */
    getAvailableSlots() {
        return Infinity;  // Unlimited storage
    },

    /**
     * Check if bank is full
     * @returns {boolean}
     */
    isFull() {
        return false;  // Unlimited storage - never full
    },

    // ========================================================================
    // FILTERING & SORTING
    // ========================================================================

    /**
     * Get items by type
     * @param {string} type - Item type (weapon, armor, consumable, material)
     * @returns {Array}
     */
    getItemsByType(type) {
        return persistentState.bank.items.filter(i => i.type === type);
    },

    /**
     * Get items by rarity
     * @param {string} rarity
     * @returns {Array}
     */
    getItemsByRarity(rarity) {
        return persistentState.bank.items.filter(i => i.rarity === rarity);
    },

    /**
     * Get all weapons
     * @returns {Array}
     */
    getWeapons() {
        return this.getItemsByType('weapon');
    },

    /**
     * Get all armor
     * @returns {Array}
     */
    getArmor() {
        return this.getItemsByType('armor');
    },

    /**
     * Get all consumables
     * @returns {Array}
     */
    getConsumables() {
        return this.getItemsByType('consumable');
    },

    /**
     * Get all materials
     * @returns {Array}
     */
    getMaterials() {
        return this.getItemsByType('material');
    },

    // ========================================================================
    // SELLING
    // ========================================================================

    /**
     * Sell an item from bank
     * @param {number} index - Item index
     * @param {number} count - Amount to sell (for stackables)
     * @returns {number} Gold received
     */
    sellItem(index, count = 1) {
        const item = persistentState.bank.items[index];
        if (!item) return 0;

        const sellValue = item.sellValue || this._calculateSellValue(item);
        const actualCount = Math.min(count, item.count || 1);
        const totalValue = sellValue * actualCount;

        // Remove item
        this.withdraw(index, actualCount);

        // Add gold
        this.depositGold(totalValue);

        console.log(`[BankingSystem] Sold ${actualCount}x ${item.name} for ${totalValue} gold`);
        return totalValue;
    },

    /**
     * Sell all materials
     * @returns {number} Total gold received
     */
    sellAllMaterials() {
        let total = 0;
        const materials = this.getMaterials();

        // Sell in reverse order to avoid index shifting issues
        for (let i = persistentState.bank.items.length - 1; i >= 0; i--) {
            const item = persistentState.bank.items[i];
            if (item.type === 'material') {
                total += this.sellItem(i, item.count || 1);
            }
        }

        console.log(`[BankingSystem] Sold all materials for ${total} gold`);
        return total;
    },

    /**
     * Calculate sell value for an item
     * @param {Object} item
     * @returns {number}
     * @private
     */
    _calculateSellValue(item) {
        // If item has explicit sell value, use it
        if (item.sellValue) return item.sellValue;

        // Calculate based on type and rarity
        let baseValue = 10;

        switch (item.type) {
            case 'material':
                baseValue = 5;
                break;
            case 'consumable':
                baseValue = 15;
                break;
            case 'weapon':
                baseValue = 50;
                break;
            case 'armor':
                baseValue = 40;
                break;
        }

        // Apply rarity multiplier
        const rarityMultipliers = {
            common: 1.0,
            uncommon: 1.5,
            rare: 2.5,
            epic: 4.0,
            legendary: 8.0
        };

        const multiplier = rarityMultipliers[item.rarity] || 1.0;
        return Math.floor(baseValue * multiplier);
    },

    // ========================================================================
    // UTILITY
    // ========================================================================

    /**
     * Sort bank items
     * @param {string} by - Sort criteria ('type', 'rarity', 'name')
     */
    sortItems(by = 'type') {
        const typeOrder = ['weapon', 'armor', 'consumable', 'material'];
        const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

        persistentState.bank.items.sort((a, b) => {
            switch (by) {
                case 'type':
                    return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
                case 'rarity':
                    return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
                case 'name':
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });

        console.log(`[BankingSystem] Sorted items by ${by}`);
    },

    /**
     * Get bank summary for UI
     * @returns {Object}
     */
    getSummary() {
        const items = persistentState.bank.items;

        return {
            gold: persistentState.bank.gold,
            totalItems: items.length,
            usedSlots: persistentState.bank.usedSlots,
            maxSlots: Infinity,  // Unlimited storage
            byType: {
                weapons: items.filter(i => i.type === 'weapon').length,
                armor: items.filter(i => i.type === 'armor').length,
                consumables: items.filter(i => i.type === 'consumable').length,
                materials: items.filter(i => i.type === 'material').length
            },
            totalValue: items.reduce((sum, item) => {
                const value = item.sellValue || this._calculateSellValue(item);
                return sum + (value * (item.count || 1));
            }, 0)
        };
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.BankingSystem = BankingSystem;

console.log('[BankingSystem] Banking system initialized');
