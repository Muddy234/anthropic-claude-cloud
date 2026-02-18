// === js/systems/loot-system.js ===
// Handles loot drops, ground loot piles, pickup, and despawn

// ============================================================================
// CONFIGURATION
// ============================================================================

const LOOT_CONFIG = {
    despawnTime: 120000,            // 120 seconds in ms (was 60)
    pileSize: 0.66,                 // 2/3 of tile size
    monsterItemChance: 0.25,        // 25% chance for monster-specific item (unchanged)
    equipmentDropChance: 0.40,      // 40% chance per kill (was 0.08)
    equipmentTypeWeights: {
        weapon: 0.50,               // 50% of equipment drops are weapons
        armor: 0.50,                // 50% are armor
    },
    shieldFromArmorChance: 0.15,    // 15% chance armor roll becomes shield
    stackableTypes: ['material', 'consumable']
};

// ============================================================================
// FLOOR-BASED RARITY WEIGHTS
// ============================================================================

const FLOOR_RARITY_WEIGHTS = {
    1:  { common: 0.90, uncommon: 0.10, rare: 0.00, epic: 0.00 },
    2:  { common: 0.80, uncommon: 0.17, rare: 0.03, epic: 0.00 },
    3:  { common: 0.65, uncommon: 0.25, rare: 0.09, epic: 0.01 },
    4:  { common: 0.55, uncommon: 0.28, rare: 0.14, epic: 0.03 },
    5:  { common: 0.50, uncommon: 0.28, rare: 0.17, epic: 0.05 },
    6:  { common: 0.45, uncommon: 0.28, rare: 0.20, epic: 0.07 },
    7:  { common: 0.40, uncommon: 0.28, rare: 0.22, epic: 0.10 },
    8:  { common: 0.35, uncommon: 0.28, rare: 0.24, epic: 0.13 },
    9:  { common: 0.30, uncommon: 0.28, rare: 0.26, epic: 0.16 },
    10: { common: 0.25, uncommon: 0.28, rare: 0.28, epic: 0.19 },
};

// ============================================================================
// ELEMENT ENCHANTMENT SYSTEM
// ============================================================================

const ENCHANTMENT_CONFIG = {
    noEnchantmentChance: 0.33,   // 33% chance of no element
    enchantmentChance: 0.67,     // 67% chance of random element
};

const ELEMENTS = ['fire', 'ice', 'water', 'earth', 'nature', 'death', 'arcane', 'dark', 'holy', 'physical'];

// Element power by rarity: Common=1, Uncommon=2, Rare=3-4, Epic=5-6, Legendary=7
const ELEMENT_POWER_BY_RARITY = {
    common: { min: 1, max: 1 },
    uncommon: { min: 2, max: 2 },
    rare: { min: 3, max: 4 },
    epic: { min: 5, max: 6 },
    legendary: { min: 7, max: 7 }
};

/**
 * Roll for an element enchantment
 * @returns {string|null} - Element name or null for no enchantment
 */
function rollElement() {
    if (Math.random() < ENCHANTMENT_CONFIG.noEnchantmentChance) {
        return null;
    }
    return ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
}

/**
 * Get element power based on item rarity
 * @param {string} rarity - Item rarity
 * @returns {number} - Element power level
 */
function getElementPower(rarity) {
    const range = ELEMENT_POWER_BY_RARITY[rarity] || ELEMENT_POWER_BY_RARITY.common;
    return range.min + Math.floor(Math.random() * (range.max - range.min + 1));
}

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
 * Roll rarity based on current floor using FLOOR_RARITY_WEIGHTS
 * @param {number} floor - Current dungeon floor (1-10)
 * @returns {string} - Selected rarity
 */
function rollFloorBasedRarity(floor) {
    // Clamp floor to valid range, default to floor 1
    const clampedFloor = Math.max(1, Math.min(10, floor || 1));
    const weights = FLOOR_RARITY_WEIGHTS[clampedFloor];

    // Apply shift multiplier to epic drops when shift is active
    let adjustedWeights = { ...weights };
    if (game.shiftActive && game.shiftLootMultiplier) {
        adjustedWeights.epic *= game.shiftLootMultiplier;
    }

    const roll = Math.random();
    let cumulative = 0;

    for (const [rarity, weight] of Object.entries(adjustedWeights)) {
        cumulative += weight;
        if (roll < cumulative) {
            return rarity;
        }
    }

    return 'common'; // Fallback
}

/**
 * Roll for equipment drop (weapons, armor, shields)
 * Uses floor-based rarity and element enchantment system
 * @returns {object|null} - Equipment item or null
 */
function rollEquipmentDrop() {
    // Get current floor (default to 1 if not available)
    const currentFloor = game.currentFloor || game.floor || 1;

    // Roll for rarity based on floor
    const selectedRarity = rollFloorBasedRarity(currentFloor);

    // Roll 50/50 for weapon vs armor
    const equipmentTypeRoll = Math.random();
    let equipmentType;

    if (equipmentTypeRoll < LOOT_CONFIG.equipmentTypeWeights.weapon) {
        equipmentType = 'weapon';
    } else {
        // Armor selected - 15% chance to become shield instead
        if (Math.random() < LOOT_CONFIG.shieldFromArmorChance) {
            equipmentType = 'shield';
        } else {
            equipmentType = 'armor';
        }
    }

    // Collect items based on equipment type and rarity
    const equipmentPool = [];

    if (equipmentType === 'weapon') {
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
    } else if (equipmentType === 'armor') {
        // Add defense armor
        if (typeof DEFENSE_ARMOR !== 'undefined') {
            for (const item of Object.values(DEFENSE_ARMOR)) {
                if (item.rarity === selectedRarity) {
                    equipmentPool.push({ ...item, type: 'armor' });
                }
            }
        }

        // Add mobility armor
        if (typeof MOBILITY_ARMOR !== 'undefined') {
            for (const item of Object.values(MOBILITY_ARMOR)) {
                if (item.rarity === selectedRarity) {
                    equipmentPool.push({ ...item, type: 'armor' });
                }
            }
        }
    } else if (equipmentType === 'shield') {
        // Add shields
        if (typeof SHIELDS !== 'undefined') {
            for (const item of Object.values(SHIELDS)) {
                if (item.rarity === selectedRarity) {
                    equipmentPool.push({ ...item, type: 'shield' });
                }
            }
        }
    }

    // Select random item from pool
    if (equipmentPool.length === 0) {
        // Fallback: try any equipment type if pool is empty
        return rollEquipmentFallback(selectedRarity);
    }

    const selectedItem = equipmentPool[Math.floor(Math.random() * equipmentPool.length)];

    // Roll for element enchantment
    const element = rollElement();
    const elementPower = element ? getElementPower(selectedRarity) : 0;

    // Return a copy with count property and element data
    return {
        ...selectedItem,
        count: 1,
        element: element,
        elementPower: elementPower
    };
}

/**
 * Fallback equipment roll when primary pool is empty
 * Tries all equipment types for the given rarity
 * @param {string} rarity - Target rarity
 * @returns {object|null} - Equipment item or null
 */
function rollEquipmentFallback(rarity) {
    const fallbackPool = [];

    // Try all equipment sources
    if (typeof MELEE_WEAPONS !== 'undefined') {
        for (const item of Object.values(MELEE_WEAPONS)) {
            if (item.rarity === rarity) {
                fallbackPool.push({ ...item, type: 'weapon' });
            }
        }
    }

    if (typeof RANGED_WEAPONS !== 'undefined') {
        for (const item of Object.values(RANGED_WEAPONS)) {
            if (item.rarity === rarity) {
                fallbackPool.push({ ...item, type: 'weapon' });
            }
        }
    }

    if (typeof DEFENSE_ARMOR !== 'undefined') {
        for (const item of Object.values(DEFENSE_ARMOR)) {
            if (item.rarity === rarity) {
                fallbackPool.push({ ...item, type: 'armor' });
            }
        }
    }

    if (typeof MOBILITY_ARMOR !== 'undefined') {
        for (const item of Object.values(MOBILITY_ARMOR)) {
            if (item.rarity === rarity) {
                fallbackPool.push({ ...item, type: 'armor' });
            }
        }
    }

    if (typeof SHIELDS !== 'undefined') {
        for (const item of Object.values(SHIELDS)) {
            if (item.rarity === rarity) {
                fallbackPool.push({ ...item, type: 'shield' });
            }
        }
    }

    if (fallbackPool.length === 0) {
        return null;
    }

    const selectedItem = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];

    // Roll for element enchantment
    const element = rollElement();
    const elementPower = element ? getElementPower(rarity) : 0;

    return {
        ...selectedItem,
        count: 1,
        element: element,
        elementPower: elementPower
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

    const pickedUp = [];
    const leftBehind = [];

    for (const item of pile.items) {
        // Try to add to inventory
        const result = addItemToInventory(item);

        if (result.success && result.added > 0) {
            pickedUp.push(item.name);

            // If only partial pickup, leave the rest
            if (result.added < (item.count || 1)) {
                leftBehind.push({
                    ...item,
                    count: (item.count || 1) - result.added
                });
            }
        } else {
            // Couldn't pick up, leave on ground
            leftBehind.push(item);
        }
    }

    // Update pile with items that couldn't be picked up
    if (leftBehind.length > 0) {
        pile.items = leftBehind;
        if (pickedUp.length > 0) {
            addMessage(`Picked up: ${pickedUp.join(', ')} (inventory full!)`);
        } else {
            addMessage('Inventory full!');
        }
    } else {
        // Remove the pile completely
        const index = game.groundLoot.indexOf(pile);
        if (index > -1) {
            game.groundLoot.splice(index, 1);
        }

        // Show message
        if (pickedUp.length > 0) {
            addMessage(`Picked up: ${pickedUp.join(', ')}`);
        }
    }
}

/**
 * Add an item to player's inventory with stacking and limits
 * @param {object} item - The item to add
 * @returns {Object} { success: boolean, added: number, message: string }
 */
function addItemToInventory(item) {
    // Use InventoryManager if available for proper stacking and limits
    if (typeof InventoryManager !== 'undefined') {
        const itemWithRarity = {
            ...item,
            rarity: item.rarity || 'common',
            favorValue: item.favorValue || getFavorValue(item)
        };
        return InventoryManager.addItem(game.player, itemWithRarity, item.count || 1);
    }

    // Fallback: original behavior (no limits)
    // Check if item is stackable and already exists
    if (LOOT_CONFIG.stackableTypes.includes(item.type)) {
        const existing = game.player.inventory.find(i => i.name === item.name);
        if (existing) {
            existing.count += item.count;
            return { success: true, added: item.count, message: `Picked up ${item.name}` };
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

    return { success: true, added: item.count || 1, message: `Picked up ${item.name}` };
}

/**
 * Attempt to pick up loot at player's current position
 * Called when player clicks on a loot pile
 */
function tryPickupLootAtPosition(gridX, gridY) {
    const pile = getLootPileAt(gridX, gridY);
    if (pile) {
        // Block interaction with invisible loot
        let visibility = 1;
        if (typeof VisionSystem !== 'undefined' && VisionSystem.getEntityVisibility) {
            visibility = VisionSystem.getEntityVisibility(gridX, gridY);
        } else if (typeof getEntityVisibility === 'function') {
            visibility = getEntityVisibility(gridX, gridY);
        }

        if (visibility <= 0) {
            // Loot is not visible - cannot interact
            return false;
        }

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

        // Skip if no tile data
        const tile = game.map[pile.y]?.[pile.x];
        if (!tile) {
            continue;
        }

        // Skip if off screen
        if (screenX < offsetX - tileSize || screenX > ctx.canvas.width ||
            screenY < -tileSize || screenY > ctx.canvas.height) {
            continue;
        }

        // =====================================================================
        // ENTITY VISIBILITY CULLING
        // =====================================================================
        // Loot is only visible within light source ranges
        let visibility = 0;

        if (typeof VisionSystem !== 'undefined' && VisionSystem.getEntityVisibility) {
            visibility = VisionSystem.getEntityVisibility(pile.x, pile.y);
        } else if (typeof getEntityVisibility === 'function') {
            visibility = getEntityVisibility(pile.x, pile.y);
        } else {
            // Fallback: use tile visibility
            visibility = (tile && tile.visible) ? 1.0 : 0;
        }

        // Store visibility on pile for interaction blocking
        pile.isVisible = visibility > 0;

        // Skip drawing if completely hidden
        if (visibility <= 0) {
            continue;
        }

        // Calculate fade for last 10 seconds (combine with visibility)
        const age = Date.now() - pile.spawnTime;
        const timeLeft = LOOT_CONFIG.despawnTime - age;
        let alpha = visibility;
        if (timeLeft < 10000) {
            // Blink effect in last 10 seconds
            const blinkAlpha = (Math.sin(age / 150) + 1) / 2 * 0.7 + 0.3;
            alpha = visibility * blinkAlpha;
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
window.FLOOR_RARITY_WEIGHTS = FLOOR_RARITY_WEIGHTS;
window.ENCHANTMENT_CONFIG = ENCHANTMENT_CONFIG;
window.ELEMENTS = ELEMENTS;
window.ELEMENT_POWER_BY_RARITY = ELEMENT_POWER_BY_RARITY;
window.getFavorValue = getFavorValue;
window.rollElement = rollElement;
window.getElementPower = getElementPower;
window.rollFloorBasedRarity = rollFloorBasedRarity;
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
