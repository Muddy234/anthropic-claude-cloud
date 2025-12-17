// ============================================================================
// INVENTORY MANAGEMENT SYSTEM
// ============================================================================

const InventoryManager = {

    /**
     * Get current inventory count (unique stacks, not total items)
     * @param {Object} player
     * @returns {number}
     */
    getSlotCount(player) {
        if (!player?.inventory) return 0;
        return player.inventory.length;
    },

    /**
     * Get total item count (including stacked items)
     * @param {Object} player
     * @returns {number}
     */
    getTotalItemCount(player) {
        if (!player?.inventory) return 0;
        return player.inventory.reduce((sum, item) => sum + (item.count || 1), 0);
    },

    /**
     * Check if inventory has room for an item
     * @param {Object} player
     * @param {Object} item
     * @returns {boolean}
     */
    hasRoom(player, item) {
        if (!player?.inventory) return false;

        const config = INVENTORY_CONFIG || { maxSlots: 15 };

        // Check if item can stack with existing
        const existing = this.findStackable(player, item);
        if (existing) {
            const maxStack = this.getMaxStack(item);
            return (existing.count || 1) < maxStack;
        }

        // Check if there's room for a new slot
        return player.inventory.length < config.maxSlots;
    },

    /**
     * Find an existing item this can stack with
     * @param {Object} player
     * @param {Object} item
     * @returns {Object|null}
     */
    findStackable(player, item) {
        if (!player?.inventory) return null;

        // Only certain types can stack
        const stackableTypes = ['consumable', 'material'];
        if (!stackableTypes.includes(item.type)) return null;

        return player.inventory.find(inv =>
            inv.name === item.name &&
            inv.type === item.type &&
            (inv.count || 1) < this.getMaxStack(item)
        );
    },

    /**
     * Get max stack size for an item
     * @param {Object} item
     * @returns {number}
     */
    getMaxStack(item) {
        const config = INVENTORY_CONFIG || { maxStacks: { default: 1 } };
        return config.maxStacks[item.type] || config.maxStacks.default || 1;
    },

    /**
     * Add item to inventory with stacking
     * @param {Object} player
     * @param {Object} item
     * @param {number} count - How many to add
     * @returns {Object} { success: boolean, added: number, message: string }
     */
    addItem(player, item, count = 1) {
        if (!player) return { success: false, added: 0, message: 'No player' };

        if (!player.inventory) {
            player.inventory = [];
        }

        const config = INVENTORY_CONFIG || { maxSlots: 15 };
        const maxStack = this.getMaxStack(item);
        let remaining = count;
        let added = 0;

        // Try to stack with existing items first
        for (const inv of player.inventory) {
            if (remaining <= 0) break;

            if (inv.name === item.name && inv.type === item.type) {
                const currentCount = inv.count || 1;
                const canAdd = Math.min(remaining, maxStack - currentCount);

                if (canAdd > 0) {
                    inv.count = currentCount + canAdd;
                    remaining -= canAdd;
                    added += canAdd;
                }
            }
        }

        // Create new stacks if needed
        while (remaining > 0 && player.inventory.length < config.maxSlots) {
            const stackAmount = Math.min(remaining, maxStack);
            player.inventory.push({
                ...item,
                count: stackAmount
            });
            remaining -= stackAmount;
            added += stackAmount;
        }

        if (added === 0) {
            return { success: false, added: 0, message: 'Inventory full!' };
        }

        if (remaining > 0) {
            return { success: true, added, message: `Picked up ${added}x ${item.name} (inventory full, ${remaining} left)` };
        }

        return { success: true, added, message: `Picked up ${added}x ${item.name}` };
    },

    /**
     * Remove item from inventory
     * @param {Object} player
     * @param {string} itemName
     * @param {number} count
     * @returns {Object} { success: boolean, removed: number }
     */
    removeItem(player, itemName, count = 1) {
        if (!player?.inventory) return { success: false, removed: 0 };

        let remaining = count;
        let removed = 0;

        // Remove from stacks
        for (let i = player.inventory.length - 1; i >= 0 && remaining > 0; i--) {
            const inv = player.inventory[i];
            if (inv.name !== itemName) continue;

            const currentCount = inv.count || 1;
            const toRemove = Math.min(remaining, currentCount);

            inv.count = currentCount - toRemove;
            remaining -= toRemove;
            removed += toRemove;

            // Remove empty stacks
            if (inv.count <= 0) {
                player.inventory.splice(i, 1);
            }
        }

        return { success: removed > 0, removed };
    },

    /**
     * Check if player has item
     * @param {Object} player
     * @param {string} itemName
     * @param {number} count
     * @returns {boolean}
     */
    hasItem(player, itemName, count = 1) {
        if (!player?.inventory) return false;

        const total = player.inventory
            .filter(i => i.name === itemName)
            .reduce((sum, i) => sum + (i.count || 1), 0);

        return total >= count;
    },

    /**
     * Get inventory summary
     * @param {Object} player
     * @returns {Object}
     */
    getSummary(player) {
        const config = INVENTORY_CONFIG || { maxSlots: 15 };

        return {
            slotsUsed: player?.inventory?.length || 0,
            maxSlots: config.maxSlots,
            totalItems: this.getTotalItemCount(player),
            isFull: (player?.inventory?.length || 0) >= config.maxSlots
        };
    }
};

// Export InventoryManager
window.InventoryManager = InventoryManager;

// ============================================================================
// ITEM USE FUNCTION (Inventory tab - uses filtered index)
// Named useItemByIndex to avoid conflict with items.js useItem(player, itemId)
// ============================================================================

function useItemByIndex(index) {
    const types = ['weapon', 'armor', 'consumable', 'material'];
    // If we are in the "Equipped" tab (4), we might want to unequip logic later, but for now ignore
    if (game.inventoryTab === 4) return false;

    const targetType = types[game.inventoryTab];
    const filteredItems = game.player.inventory.filter(i => i.type === targetType);

    if (index < 0 || index >= filteredItems.length) return false;
    const item = filteredItems[index];

    // Find the actual index in the main inventory array to modify it
    const realIndex = game.player.inventory.indexOf(item);

    // Try to use item via its effect property (new system)
    if (item.effect && itemEffects[item.effect.type]) {
        const effect = item.effect;
        let msg;

        // Call the effect handler with appropriate parameters
        switch (effect.type) {
            case 'heal':
                msg = itemEffects.heal(game.player, effect.value);
                break;
            case 'healPercent':
                msg = itemEffects.healPercent(game.player, effect.value);
                break;
            case 'healOverTime':
                msg = itemEffects.healOverTime(game.player, effect.value, effect.duration);
                break;
            case 'restoreMana':
                msg = itemEffects.restoreMana(game.player, effect.value);
                break;
            case 'buff':
                msg = itemEffects.buff(game.player, effect.stat, effect.value, effect.duration);
                break;
            case 'cure':
                msg = itemEffects.cure(game.player, effect.status);
                break;
            case 'stealth':
                msg = itemEffects.stealth(game.player, effect.duration);
                break;
            case 'deployable':
                msg = itemEffects.deployable(game.player, effect.deployType);
                // Check if deployment failed
                if (msg.includes('Cannot')) {
                    addMessage(msg);
                    return false;
                }
                break;
            default:
                msg = 'Unknown effect';
        }

        addMessage(`Used ${item.name}: ${msg}`);
        item.count--;
        if (item.count <= 0) game.player.inventory.splice(realIndex, 1);
        return true;
    }

    // Legacy fallback: lookup by item name directly
    if (itemEffects[item.name]) {
        const msg = itemEffects[item.name](game.player);
        addMessage(`Used ${item.name}: ${msg}`);
        item.count--;
        if (item.count <= 0) game.player.inventory.splice(realIndex, 1);
        return true;
    }

    return false;
}
// ============================================================================
// SYSTEM MANAGER REGISTRATION - Add to end of inventory-system.js
// ============================================================================

const InventorySystemDef = {
    name: 'inventory-system',
    
    // No per-frame updates currently needed
    // Inventory is event-driven (pickup, use, equip)
    update(dt) {
        // Future: Could add timed item effects, buff durations, etc.
    }
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('inventory-system', InventorySystemDef, 65);
} else {
    console.warn('⚠️ SystemManager not found - inventory-system running standalone');
}

// Export useItemByIndex for input-handler consumable usage
window.useItemByIndex = useItemByIndex;

console.log('✅ Inventory system loaded');
