function useItem(index) {
    const types = ['weapon', 'armor', 'consumable', 'material'];
    // If we are in the "Equipped" tab (4), we might want to unequip logic later, but for now ignore
    if (game.inventoryTab === 4) return false;

    const targetType = types[game.inventoryTab];
    const filteredItems = game.player.inventory.filter(i => i.type === targetType);

    if (index < 0 || index >= filteredItems.length) return false;
    const item = filteredItems[index];

    // Find the actual index in the main inventory array to modify it
    const realIndex = game.player.inventory.indexOf(item);

    if (itemEffects[item.name]) {
        const msg = itemEffects[item.name](game.player);
        if (game.combat) {
            game.combat.log.push(`Used ${item.name}: ${msg}`);
            game.combat.menuState = 'main';
            game.combat.playerTurn = false;
            setTimeout(enemyTurn, 1000);
        } else {
            addMessage(`Used ${item.name}: ${msg}`);
        }
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

console.log('✅ Inventory system loaded');
