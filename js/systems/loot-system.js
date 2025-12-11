// === js/systems/loot-system.js ===
// Handles loot drops, ground loot piles, pickup, and despawn

// ============================================================================
// CONFIGURATION
// ============================================================================

const LOOT_CONFIG = {
    despawnTime: 60000,         // 60 seconds in ms
    pileSize: 0.66,             // 2/3 of tile size
    monsterItemChance: 0.25,    // 25% chance for monster-specific item (already has dropChance)
    equipmentDropChance: 0.08,  // 8% base chance to roll for equipment
    stackableTypes: ['material', 'consumable']
};

// ============================================================================
// FAVOR VALUE CONFIG - HP restoration from sacrificing items
// ============================================================================

const FAVOR_CONFIG = {
    // HP restored per rarity tier (min-max range)
    common:   { min: 2, max: 5 },
    uncommon: { min: 10, max: 20 },
    rare:     { min: 35, max: 55 },
    epic:     { min: 100, max: 120 }
};

/**
 * Get favor value (HP restoration) for an item based on rarity
 * @param {object} item - The item
 * @returns {number} - Favor value (HP to restore)
 */
function getFavorValue(item) {
    // If item has explicit favorValue, use it
    if (item.favorValue) {
        return item.favorValue;
    }

    // Calculate based on rarity
    const rarity = item.rarity || 'common';
    const range = FAVOR_CONFIG[rarity] || FAVOR_CONFIG.common;
    return range.min + Math.floor(Math.random() * (range.max - range.min + 1));
}

// ============================================================================
// LOOT PILE DATA STRUCTURE
// ============================================================================

// Initialize ground loot array (add to game-state.js or here)
if (typeof game !== 'undefined' && !game.groundLoot) {
    game.groundLoot = [];
}

/**
 * Loot pile structure:
 * {
 *     id: unique identifier,
 *     x: grid x position,
 *     y: grid y position,
 *     items: [
 *         { name: 'Ashes', type: 'material', count: 1, rarity: 'common', favorValue: 3 },
 *         { name: 'Rusty Broadsword', type: 'weapon', count: 1, rarity: 'uncommon', ... }
 *     ],
 *     spawnTime: timestamp when created
 * }
 */

let lootIdCounter = 0;

// ============================================================================
// LOOT SPAWNING
// ============================================================================

/**
 * Spawn a loot pile when an enemy dies
 * @param {number} x - Grid X position
 * @param {number} y - Grid Y position
 * @param {object} enemy - The defeated enemy
 */
function spawnLootPile(x, y, enemy) {
    const items = [];
    const monsterData = MONSTER_DATA[enemy.name] || enemy;

    // Roll for monster-specific item
    if (Math.random() < LOOT_CONFIG.monsterItemChance) {
        const monsterItem = rollMonsterLoot(enemy.name);
        if (monsterItem) {
            items.push(monsterItem);
        }
    }

    // Roll for equipment drop
    if (Math.random() < LOOT_CONFIG.equipmentDropChance) {
        const equipment = rollEquipmentDrop();
        if (equipment) {
            items.push(equipment);
        }
    }

    // Only create pile if there's something to drop
    if (items.length > 0) {
        const pile = {
            id: ++lootIdCounter,
            x: x,
            y: y,
            items: items,
            spawnTime: Date.now()
        };

        game.groundLoot.push(pile);

        // Log what dropped
        const itemNames = items.map(i => i.name).join(', ');
        console.log(`Loot dropped at (${x}, ${y}): ${itemNames}`);
    }
}

/**
 * Roll for monster-specific loot (uses existing function if available)
 */
function rollMonsterLootInternal(monsterName) {
    // Use existing rollMonsterLoot if available
    if (typeof rollMonsterLoot === 'function') {
        return rollMonsterLoot(monsterName);
    }

    // Fallback implementation
    const monster = MONSTER_DATA[monsterName];
    if (!monster || !monster.loot) return null;

    const shuffledLoot = [...monster.loot].sort(() => Math.random() - 0.5);

    for (const lootItem of shuffledLoot) {
        if (Math.random() <= lootItem.dropChance) {
            return {
                name: lootItem.name,
                type: 'material',
                rarity: lootItem.rarity || 'common',
                favorValue: lootItem.favorValue || 3,
                count: 1
            };
        }
    }

    return null;
}

/**
 * Roll for equipment drop (weapons, armor, shields)
 * @returns {object|null} - Equipment item or null
 */
function rollEquipmentDrop() {
    // Rarity weights (higher number = more common)
    const rarityWeights = {
        'common': 50,      // 50% of drops
        'uncommon': 35,    // 35% of drops
        'rare': 13,        // 13% of drops
        'epic': 2          // 2% of drops
    };

    // Apply shift multiplier to epic drops when shift is active
    if (game.shiftActive && game.shiftLootMultiplier) {
        rarityWeights['epic'] *= game.shiftLootMultiplier;
    }

    // Roll for rarity
    const totalWeight = Object.values(rarityWeights).reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;
    let selectedRarity = 'common';

    for (const [rarity, weight] of Object.entries(rarityWeights)) {
        roll -= weight;
        if (roll <= 0) {
            selectedRarity = rarity;
            break;
        }
    }

    // Collect all equipment items of the selected rarity
    const equipmentPool = [];

    // Add melee weapons
    if (typeof MELEE_WEAPONS !== 'undefined') {
        for (const item of Object.values(MELEE_WEAPONS)) {
            if (item.rarity === selectedRarity) {
                equipmentPool.push({ ...item, type: 'weapon' });
            }
        }
    }

    // Add ranged weapons
    if (typeof RANGED_WEAPONS !== 'undefined') {
        for (const item of Object.values(RANGED_WEAPONS)) {
            if (item.rarity === selectedRarity) {
                equipmentPool.push({ ...item, type: 'weapon' });
            }
        }
    }

    // Add armor
    if (typeof DEFENSE_ARMOR !== 'undefined') {
        for (const item of Object.values(DEFENSE_ARMOR)) {
            if (item.rarity === selectedRarity) {
                equipmentPool.push({ ...item, type: 'armor' });
            }
        }
    }

    if (typeof MOBILITY_ARMOR !== 'undefined') {
        for (const item of Object.values(MOBILITY_ARMOR)) {
            if (item.rarity === selectedRarity) {
                equipmentPool.push({ ...item, type: 'armor' });
            }
        }
    }

    // Select random item from pool
    if (equipmentPool.length === 0) {
        return null;
    }

    const selectedItem = equipmentPool[Math.floor(Math.random() * equipmentPool.length)];

    // Return a copy with count property for inventory system
    return {
        ...selectedItem,
        count: 1
    };
}

// ============================================================================
// LOOT PICKUP
// ============================================================================

/**
 * Check if there's a loot pile at the given position
 * @param {number} x - Grid X
 * @param {number} y - Grid Y
 * @returns {object|null} - The loot pile or null
 */
function getLootPileAt(x, y) {
    return game.groundLoot.find(pile =>
        Math.floor(pile.x) === Math.floor(x) &&
        Math.floor(pile.y) === Math.floor(y)
    );
}

/**
 * Pick up all items from a loot pile
 * @param {object} pile - The loot pile to pick up
 */
function pickupLootPile(pile) {
    if (!pile || !pile.items) return;

    const messages = [];

    for (const item of pile.items) {
        // Add to inventory
        addItemToInventory(item);
        messages.push(item.name);
    }

    // Remove the pile
    const index = game.groundLoot.indexOf(pile);
    if (index > -1) {
        game.groundLoot.splice(index, 1);
    }

    // Show message
    if (messages.length > 0) {
        addMessage(`Picked up: ${messages.join(', ')}`);
    }
}

/**
 * Add an item to player's inventory with stacking
 * @param {object} item - The item to add
 */
function addItemToInventory(item) {
    // Check if item is stackable and already exists
    if (LOOT_CONFIG.stackableTypes.includes(item.type)) {
        const existing = game.player.inventory.find(i => i.name === item.name);
        if (existing) {
            existing.count += item.count;
            return;
        }
    }

    // Add as new item
    game.player.inventory.push({
        name: item.name,
        type: item.type,
        count: item.count,
        rarity: item.rarity || 'common',
        favorValue: item.favorValue || getFavorValue(item),
        ...item
    });
}

/**
 * Attempt to pick up loot at player's current position
 * Called when player clicks on a loot pile
 */
function tryPickupLootAtPosition(gridX, gridY) {
    const pile = getLootPileAt(gridX, gridY);
    if (pile) {
        pickupLootPile(pile);
        return true;
    }
    return false;
}

// ============================================================================
// LOOT UPDATE (Despawn Timer)
// ============================================================================

/**
 * Update loot piles - remove expired ones
 * Call this from main update loop
 * @param {number} deltaTime - Time since last update in ms
 */
function updateLootPiles(deltaTime) {
    if (!game.groundLoot) return;

    const now = Date.now();

    // Remove expired loot piles
    for (let i = game.groundLoot.length - 1; i >= 0; i--) {
        const pile = game.groundLoot[i];
        const age = now - pile.spawnTime;

        if (age >= LOOT_CONFIG.despawnTime) {
            console.log(`Loot pile despawned at (${pile.x}, ${pile.y})`);
            game.groundLoot.splice(i, 1);
        }
    }
}

// ============================================================================
// LOOT RENDERING
// ============================================================================

/**
 * Render all loot piles on the ground
 * Call this from renderer after floor tiles but before entities
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} camX - Camera X offset
 * @param {number} camY - Camera Y offset
 * @param {number} tileSize - Effective tile size (TILE_SIZE * ZOOM_LEVEL)
 * @param {number} offsetX - Tracker width offset
 */
function renderLootPiles(ctx, camX, camY, tileSize, offsetX) {
    if (!game.groundLoot) return;

    const pileSize = tileSize * LOOT_CONFIG.pileSize;
    const padding = (tileSize - pileSize) / 2;

    for (const pile of game.groundLoot) {
        const screenX = (pile.x - camX) * tileSize + offsetX + padding;
        const screenY = (pile.y - camY) * tileSize + padding;

        // FOG OF WAR: Show loot on EXPLORED tiles (with brightness-based dimming)
        const tile = game.map[pile.y]?.[pile.x];
        if (!tile || !tile.explored) {
            continue;
        }

        // Skip if off screen
        if (screenX < offsetX - tileSize || screenX > ctx.canvas.width ||
            screenY < -tileSize || screenY > ctx.canvas.height) {
            continue;
        }

        // Get tile brightness for distance-based dimming
        const brightness = typeof getTileBrightness === 'function'
            ? getTileBrightness(pile.x, pile.y)
            : 1.0;

        // Calculate fade for last 10 seconds
        const age = Date.now() - pile.spawnTime;
        const timeLeft = LOOT_CONFIG.despawnTime - age;
        let alpha = brightness; // Start with brightness-based alpha
        if (timeLeft < 10000) {
            // Blink effect in last 10 seconds
            const blinkAlpha = (Math.sin(age / 150) + 1) / 2 * 0.7 + 0.3;
            alpha = brightness * blinkAlpha;
        }

        ctx.globalAlpha = alpha;

        // Draw loot star (now represents offerings/items, not gold)
        drawLootStar(ctx, screenX + pileSize / 2, screenY + pileSize / 2, pileSize / 2);

        // Draw item count badge if multiple items
        if (pile.items.length > 1) {
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(screenX + pileSize - 5, screenY + 5, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(pile.items.length.toString(), screenX + pileSize - 5, screenY + 9);
        }

        ctx.globalAlpha = 1.0;
    }
}

/**
 * Draw a star shape for loot pile
 */
function drawLootStar(ctx, cx, cy, radius) {
    const spikes = 5;
    const outerRadius = radius;
    const innerRadius = radius * 0.5;

    ctx.beginPath();
    ctx.fillStyle = '#9b59b6'; // Purple color for offerings
    ctx.strokeStyle = '#6c3483'; // Darker purple outline
    ctx.lineWidth = 2;

    for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / 2 * 3) + (i * Math.PI / spikes);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Add shine effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.2, cy - radius * 0.2, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Check if a screen position is over a loot pile
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {number} camX - Camera X
 * @param {number} camY - Camera Y
 * @param {number} tileSize - Effective tile size
 * @param {number} offsetX - Tracker width offset
 * @returns {object|null} - The loot pile or null
 */
function getLootPileAtScreen(screenX, screenY, camX, camY, tileSize, offsetX) {
    const gridX = Math.floor((screenX - offsetX) / tileSize + camX);
    const gridY = Math.floor(screenY / tileSize + camY);

    return getLootPileAt(gridX, gridY);
}

// ============================================================================
// INTEGRATION HELPERS
// ============================================================================

/**
 * Initialize loot system
 * Call this when starting a new game
 */
function initializeLootSystem() {
    if (!game.groundLoot) {
        game.groundLoot = [];
    } else {
        game.groundLoot.length = 0; // Clear existing
    }
    lootIdCounter = 0;
    console.log('✓ Loot system initialized');
}

/**
 * Get loot summary for a pile (for tooltips)
 * @param {object} pile - The loot pile
 * @returns {string} - Summary text
 */
function getLootPileSummary(pile) {
    if (!pile || !pile.items) return '';

    return pile.items.map(item => {
        return item.count > 1 ? `${item.name} x${item.count}` : item.name;
    }).join(', ');
}

// ============================================================================
// EXPORTS
// ============================================================================

window.LOOT_CONFIG = LOOT_CONFIG;
window.FAVOR_CONFIG = FAVOR_CONFIG;
window.getFavorValue = getFavorValue;
window.spawnLootPile = spawnLootPile;
window.getLootPileAt = getLootPileAt;
window.pickupLootPile = pickupLootPile;
window.tryPickupLootAtPosition = tryPickupLootAtPosition;
window.updateLootPiles = updateLootPiles;
window.renderLootPiles = renderLootPiles;
window.getLootPileAtScreen = getLootPileAtScreen;
window.initializeLootSystem = initializeLootSystem;
window.getLootPileSummary = getLootPileSummary;
window.addItemToInventory = addItemToInventory;

console.log('✓ Loot system loaded');

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const LootSystemDef = {
    name: 'loot-system',

    init(game) {
        initializeLootSystem();
    },

    update(dt) {
        updateLootPiles(dt);
    },

    cleanup() {
        // Clear ground loot on floor transition
        if (game.groundLoot) {
            game.groundLoot.length = 0;
        }
        lootIdCounter = 0;
    }
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('loot-system', LootSystemDef, 70);
} else {
    console.warn('⚠️ SystemManager not found - loot-system running standalone');
}

console.log('✅ Loot system loaded (with SystemManager)');
