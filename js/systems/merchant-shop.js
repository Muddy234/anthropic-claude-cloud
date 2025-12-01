// === js/data/merchant-shop.js ===
// Merchant inventory and purchase logic

// ============================================================================
// MERCHANT SHOP INVENTORY
// ============================================================================

const MERCHANT_SHOP = {
    // Consumables
    consumables: [
        { name: 'Health Potion', price: 30, type: 'consumable', description: 'Restores 50 HP' }
    ],
    
    // Starter weapons (one per proficiency)
    weapons: [
        { 
            name: 'Rusty Broadsword', 
            price: 10, 
            type: 'weapon',
            proficiency: 'Blade',
            description: 'A basic sword to start your blade training.'
        },
        { 
            name: 'Stone Club', 
            price: 8, 
            type: 'weapon',
            proficiency: 'Blunt',
            description: 'A heavy club for crushing blows.'
        },
        { 
            name: 'Ember Wand', 
            price: 18, 
            type: 'weapon',
            proficiency: 'Magic',
            description: 'A charred wand for fire magic.'
        },
        { 
            name: 'Hunting Shortbow', 
            price: 15, 
            type: 'weapon',
            proficiency: 'Ranged',
            description: 'A compact bow for ranged combat.'
        }
    ]
};

// ============================================================================
// PURCHASE FUNCTIONS
// ============================================================================

/**
 * Attempt to purchase an item from the merchant
 * @param {string} itemName - Name of the item to purchase
 * @returns {object} - { success: boolean, message: string }
 */
function purchaseFromMerchant(itemName) {
    // Find the item in shop
    let shopItem = MERCHANT_SHOP.consumables.find(i => i.name === itemName);
    if (!shopItem) {
        shopItem = MERCHANT_SHOP.weapons.find(i => i.name === itemName);
    }
    
    if (!shopItem) {
        return { success: false, message: "Item not found!" };
    }
    
    // Check gold
    if (game.gold < shopItem.price) {
        return { success: false, message: "Not enough gold!" };
    }
    
    // Deduct gold
    game.gold -= shopItem.price;
    
    // Add to inventory
    const existingItem = game.player.inventory.find(i => i.name === itemName);
    
    if (existingItem) {
        existingItem.count++;
    } else {
        // Get full item data from EQUIPMENT_DATA if available
        const equipData = typeof EQUIPMENT_DATA !== 'undefined' ? EQUIPMENT_DATA[itemName] : null;
        
        game.player.inventory.push({
            name: itemName,
            count: 1,
            type: shopItem.type,
            description: shopItem.description,
            ...(equipData || {})
        });
    }
    
    return { success: true, message: `Bought ${itemName}!` };
}

/**
 * Get all items available for purchase
 */
function getMerchantItems() {
    return {
        consumables: MERCHANT_SHOP.consumables,
        weapons: MERCHANT_SHOP.weapons
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

window.MERCHANT_SHOP = MERCHANT_SHOP;
window.purchaseFromMerchant = purchaseFromMerchant;
window.getMerchantItems = getMerchantItems;

console.log('âœ“ Merchant shop loaded');// ============================================================================
// SYSTEM MANAGER REGISTRATION - Add to end of merchant-shop.js
// ============================================================================

const MerchantShopSystem = {
    name: 'merchant-shop',
    
    // Merchant UI state management
    update(dt) {
        // Future: Could add merchant animation, inventory refresh timers, etc.
        // Currently event-driven through input handler
    },
    
    cleanup() {
        // Reset merchant state on floor/game transition
        game.merchantVisited = false;
        game.merchantMode = 'menu';
        game.merchantMsg = '';
    }
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('merchant-shop', MerchantShopSystem, 90);
} else {
    console.warn('⚠️ SystemManager not found - merchant-shop running standalone');
}

console.log('✅ Merchant shop loaded (with SystemManager)');
