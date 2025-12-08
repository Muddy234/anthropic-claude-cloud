// ============================================================================
// ROOM DECORATOR - The Shifting Chasm
// ============================================================================
// Updated: Element-based decoration selection, hazard integration
// ============================================================================

// ============================================================================
// CONFIGURATION
// ============================================================================

const DECORATOR_CONFIG = {
    decorationDensity: 0.08,      // 8% of floor tiles
    minDecorations: 2,
    maxDecorations: 12,
    edgeMargin: 1,                // Keep decorations away from walls
    clusterChance: 0.3,           // Chance to place decorations in clusters
    debugLogging: true
};

// ============================================================================
// ELEMENT-BASED DECORATION POOLS
// ============================================================================

const ELEMENT_DECORATIONS = {
    fire: {
        blocking: ['lava_rock', 'charred_pillar', 'ember_brazier', 'scorched_bones'],
        floor: ['ash_pile', 'cinder_patch', 'heat_vent', 'burnt_debris'],
        wall: ['torch_sconce', 'flame_rune', 'soot_marks'],
        special: ['fire_shrine', 'magma_pool_small', 'sacrifice_altar']
    },
    ice: {
        blocking: ['ice_pillar', 'frozen_statue', 'frost_crystal', 'icicle_cluster'],
        floor: ['ice_patch', 'snow_drift', 'frozen_puddle', 'frost_runes'],
        wall: ['ice_formation', 'frozen_torch', 'rime_coating'],
        special: ['ice_shrine', 'frozen_chest', 'sacrifice_altar']
    },
    water: {
        blocking: ['coral_formation', 'water_pillar', 'shell_mound', 'barnacle_rock'],
        floor: ['shallow_pool', 'wet_stones', 'seaweed_patch', 'tide_pool'],
        wall: ['dripping_moss', 'water_stain', 'shell_decoration'],
        special: ['water_shrine', 'sunken_chest', 'sacrifice_altar']
    },
    earth: {
        blocking: ['boulder', 'stalagmite', 'crystal_cluster', 'stone_pillar'],
        floor: ['gravel_patch', 'crystal_shard', 'mineral_vein', 'cracked_floor'],
        wall: ['ore_vein', 'fossil_imprint', 'cave_painting'],
        special: ['earth_shrine', 'geode', 'sacrifice_altar']
    },
    nature: {
        blocking: ['giant_mushroom', 'twisted_tree', 'thorn_bush', 'moss_boulder'],
        floor: ['mushroom_cluster', 'vine_patch', 'flower_bed', 'leaf_pile'],
        wall: ['hanging_vines', 'wall_fungus', 'root_growth'],
        special: ['nature_shrine', 'healing_spring', 'sacrifice_altar']
    },
    death: {
        blocking: ['bone_pile', 'tombstone', 'coffin', 'skeletal_remains'],
        floor: ['skull_pile', 'grave_dirt', 'spectral_residue', 'death_rune'],
        wall: ['bone_decoration', 'death_mask', 'crypt_inscription'],
        special: ['death_shrine', 'sarcophagus', 'sacrifice_altar']
    },
    arcane: {
        blocking: ['arcane_pillar', 'floating_crystal', 'runic_obelisk', 'mana_font'],
        floor: ['rune_circle', 'magic_residue', 'glyph_pattern', 'power_conduit'],
        wall: ['arcane_inscription', 'glowing_rune', 'spell_scar'],
        special: ['arcane_shrine', 'enchanting_table', 'sacrifice_altar']
    },
    dark: {
        blocking: ['shadow_pillar', 'void_crystal', 'dark_altar', 'nightmare_statue'],
        floor: ['shadow_pool', 'dark_rune', 'void_crack', 'nightmare_residue'],
        wall: ['shadow_stain', 'void_portal_small', 'dark_inscription'],
        special: ['dark_shrine', 'shadow_chest', 'sacrifice_altar']
    },
    holy: {
        blocking: ['light_pillar', 'angel_statue', 'sacred_font', 'prayer_altar'],
        floor: ['holy_circle', 'blessed_tiles', 'light_beam', 'sacred_rune'],
        wall: ['holy_symbol', 'divine_inscription', 'light_sconce'],
        special: ['holy_shrine', 'blessing_fountain', 'sacrifice_altar']
    },
    physical: {
        blocking: ['weapon_rack', 'training_dummy', 'pillar', 'broken_statue'],
        floor: ['blood_stain', 'weapon_debris', 'chain_pile', 'sand_pit'],
        wall: ['trophy_mount', 'battle_scar', 'chain_mount'],
        special: ['combat_shrine', 'arena_chest', 'sacrifice_altar']
    }
};

// Fallback decorations for unknown elements
const DEFAULT_DECORATIONS = {
    blocking: ['pillar', 'boulder', 'crate', 'barrel'],
    floor: ['debris', 'dust_pile', 'crack', 'stain'],
    wall: ['torch', 'cobweb', 'crack'],
    special: ['chest', 'altar']
};

// ============================================================================
// MAIN DECORATION FUNCTION
// ============================================================================

/**
 * Decorate a room based on its element and theme
 * @param {Object} room - Room to decorate
 */
function decorateRoom(room) {
    if (!room) return;
    
    const element = room.element || 'physical';
    const decorPool = ELEMENT_DECORATIONS[element] || DEFAULT_DECORATIONS;
    
    // Calculate decoration count
    const area = (room.floorWidth || 20) * (room.floorHeight || 20);
    let count = Math.floor(area * DECORATOR_CONFIG.decorationDensity);
    count = Math.max(DECORATOR_CONFIG.minDecorations, count);
    count = Math.min(DECORATOR_CONFIG.maxDecorations, count);
    
    // Adjust for room type
    if (room.type === 'entrance') count = Math.floor(count * 0.5);
    if (room.type === 'boss') count = Math.floor(count * 0.3);
    if (room.type === 'treasure') count = Math.floor(count * 1.5);
    
    if (DECORATOR_CONFIG.debugLogging) {
        console.log(`[Decorator] Placing ${count} decorations in ${element} ${room.type} room`);
    }
    
    const placedPositions = new Set();
    let placedCount = 0;
    
    // Place special decoration first (shrines, chests)
    if (room.type !== 'entrance' && Math.random() < 0.3) {
        const specialPos = findDecorationPosition(room, placedPositions, true);
        if (specialPos) {
            const specialType = decorPool.special[Math.floor(Math.random() * decorPool.special.length)];
            placeDecoration(specialPos.x, specialPos.y, specialType, room, true, true);
            placedPositions.add(`${specialPos.x},${specialPos.y}`);
            placedCount++;
        }
    }
    
    // Place blocking decorations (pillars, statues)
    const blockingCount = Math.floor(count * 0.3);
    for (let i = 0; i < blockingCount && placedCount < count; i++) {
        const pos = findDecorationPosition(room, placedPositions, true);
        if (pos) {
            const type = decorPool.blocking[Math.floor(Math.random() * decorPool.blocking.length)];
            placeDecoration(pos.x, pos.y, type, room, true, false);
            placedPositions.add(`${pos.x},${pos.y}`);
            placedCount++;
            
            // Cluster chance
            if (Math.random() < DECORATOR_CONFIG.clusterChance) {
                const clusterPos = findAdjacentPosition(pos.x, pos.y, room, placedPositions);
                if (clusterPos) {
                    const clusterType = decorPool.floor[Math.floor(Math.random() * decorPool.floor.length)];
                    placeDecoration(clusterPos.x, clusterPos.y, clusterType, room, false, false);
                    placedPositions.add(`${clusterPos.x},${clusterPos.y}`);
                    placedCount++;
                }
            }
        }
    }
    
    // Place floor decorations
    while (placedCount < count) {
        const pos = findDecorationPosition(room, placedPositions, false);
        if (!pos) break;
        
        const type = decorPool.floor[Math.floor(Math.random() * decorPool.floor.length)];
        placeDecoration(pos.x, pos.y, type, room, false, false);
        placedPositions.add(`${pos.x},${pos.y}`);
        placedCount++;
    }
    
    if (DECORATOR_CONFIG.debugLogging) {
        console.log(`[Decorator] Placed ${placedCount} decorations`);
    }
}

// ============================================================================
// DECORATION PLACEMENT
// ============================================================================

/**
 * Place a single decoration
 */
function placeDecoration(x, y, type, room, blocking, interactable) {
    const decoration = {
        x: x,
        y: y,
        type: type,
        room: room,
        element: room.element,
        blocking: blocking,
        interactable: interactable,
        
        // Visual properties (can be overridden by tileset)
        sprite: getDecorationSprite(type, room.element),
        color: getDecorationColor(type, room.element)
    };
    
    // Add to game decorations array
    if (!game.decorations) game.decorations = [];
    game.decorations.push(decoration);
    
    // Mark tile as having decoration
    const tile = game.map?.[y]?.[x];
    if (tile) {
        tile.decoration = decoration;
        if (blocking) tile.blocked = true;
    }
    
    return decoration;
}

/**
 * Find a valid position for decoration
 */
function findDecorationPosition(room, usedPositions, needsSpace) {
    const margin = DECORATOR_CONFIG.edgeMargin + (needsSpace ? 1 : 0);
    const maxAttempts = 30;
    
    for (let i = 0; i < maxAttempts; i++) {
        const dx = margin + Math.floor(Math.random() * ((room.floorWidth || 20) - margin * 2));
        const dy = margin + Math.floor(Math.random() * ((room.floorHeight || 20) - margin * 2));
        const x = (room.floorX || room.x + 1) + dx;
        const y = (room.floorY || room.y + 1) + dy;
        
        if (usedPositions.has(`${x},${y}`)) continue;
        
        // Check tile
        const tile = game.map?.[y]?.[x];
        if (!tile || tile.type !== 'floor' || tile.decoration || tile.blocked) continue;
        
        // Check for hazards
        if (tile.hazard) continue;
        
        // For blocking decorations, ensure pathways remain
        if (needsSpace && !hasAdjacentFloor(x, y)) continue;
        
        return { x, y };
    }
    
    return null;
}

/**
 * Find a position adjacent to given coordinates
 */
function findAdjacentPosition(x, y, room, usedPositions) {
    const dirs = [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
        { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
    ].sort(() => Math.random() - 0.5);
    
    for (const dir of dirs) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        
        if (usedPositions.has(`${nx},${ny}`)) continue;
        
        const tile = game.map?.[ny]?.[nx];
        if (tile && tile.type === 'floor' && !tile.decoration && !tile.blocked) {
            return { x: nx, y: ny };
        }
    }
    
    return null;
}

/**
 * Check if position has adjacent floor tiles (for pathfinding)
 */
function hasAdjacentFloor(x, y) {
    let floorCount = 0;
    const dirs = [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
        { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
    ];
    
    for (const dir of dirs) {
        const tile = game.map?.[y + dir.dy]?.[x + dir.dx];
        if (tile && tile.type === 'floor' && !tile.blocked) {
            floorCount++;
        }
    }
    
    return floorCount >= 2; // At least 2 adjacent floors
}

// ============================================================================
// DECORATION VISUALS
// ============================================================================

/**
 * Get sprite info for decoration type
 */
function getDecorationSprite(type, element) {
    // Check tileset reference if available
    if (typeof TILESET_DECORATIONS !== 'undefined' && TILESET_DECORATIONS[type]) {
        return TILESET_DECORATIONS[type];
    }
    
    // Default sprite coordinates (fallback)
    return { sx: 0, sy: 0, sw: 32, sh: 32 };
}

/**
 * Get color for decoration based on element
 */
function getDecorationColor(type, element) {
    const elementColors = {
        fire: '#ff6b35',
        ice: '#74b9ff',
        water: '#0984e3',
        earth: '#a0522d',
        nature: '#00b894',
        death: '#636e72',
        arcane: '#a855f7',
        dark: '#2d3436',
        holy: '#fdcb6e',
        physical: '#b2bec3'
    };
    
    return elementColors[element] || '#888888';
}

// ============================================================================
// DECORATION QUERIES
// ============================================================================

/**
 * Check if there's a blocking decoration at position
 */
function hasBlockingDecorationAt(x, y) {
    if (!game.decorations) return false;
    
    return game.decorations.some(d => 
        d.blocking && 
        Math.floor(d.x) === Math.floor(x) && 
        Math.floor(d.y) === Math.floor(y)
    );
}

/**
 * Get decoration at position
 */
function getDecorationAt(x, y) {
    if (!game.decorations) return null;
    
    return game.decorations.find(d => 
        Math.floor(d.x) === Math.floor(x) && 
        Math.floor(d.y) === Math.floor(y)
    );
}

/**
 * Get all decorations in a room
 */
function getDecorationsInRoom(room) {
    if (!game.decorations || !room) return [];
    return game.decorations.filter(d => d.room === room);
}

/**
 * Get interactable decorations near position
 */
function getInteractableDecorationsNear(x, y, range = 1) {
    if (!game.decorations) return [];
    
    return game.decorations.filter(d => {
        if (!d.interactable) return false;
        const dist = Math.abs(d.x - x) + Math.abs(d.y - y);
        return dist <= range;
    });
}

// ============================================================================
// DECORATION INTERACTION
// ============================================================================

/**
 * Interact with a decoration (shrines, chests, etc.)
 */
function interactWithDecoration(decoration, player) {
    if (!decoration || !decoration.interactable) return false;
    
    const type = decoration.type;
    
    // Shrines
    if (type.includes('shrine')) {
        return activateShrine(decoration, player);
    }
    
    // Chests
    if (type.includes('chest')) {
        return openChest(decoration, player);
    }
    
    // Healing springs
    if (type === 'healing_spring' || type === 'blessing_fountain') {
        player.hp = player.maxHp;
        if (typeof addMessage === 'function') {
            addMessage('You feel refreshed!');
        }
        decoration.interactable = false; // One use
        return true;
    }

    // Sacrifice Altars
    if (type === 'sacrifice_altar') {
        return openSacrificeUI(decoration, player);
    }

    return false;
}

/**
 * Activate a shrine
 */
function activateShrine(shrine, player) {
    const element = shrine.element || shrine.room?.element;
    
    // Grant attunement boost
    if (typeof AttunementSystem !== 'undefined' && element) {
        AttunementSystem.playerAttunement.values[element] = Math.min(
            100,
            (AttunementSystem.playerAttunement.values[element] || 0) + 25
        );
    }
    
    // Grant buff based on element
    if (typeof applyStatusEffect === 'function') {
        const shrineBuffs = {
            fire: 'strengthened',
            ice: 'shielded',
            nature: 'regenerating',
            holy: 'sanctified',
            arcane: 'hastened'
        };
        const buff = shrineBuffs[element];
        if (buff) applyStatusEffect(player, buff);
    }
    
    if (typeof addMessage === 'function') {
        addMessage(`The ${element} shrine empowers you!`);
    }
    
    shrine.interactable = false;
    return true;
}

/**
 * Open a chest
 */
function openChest(chest, player) {
    // Generate random loot (no gold)
    const items = [];

    // Always drop a material/consumable
    if (typeof rollMonsterLoot === 'function') {
        // Pick a random monster to get loot from
        const monsterNames = Object.keys(MONSTER_DATA || {});
        if (monsterNames.length > 0) {
            const randomMonster = monsterNames[Math.floor(Math.random() * monsterNames.length)];
            const loot = rollMonsterLoot(randomMonster);
            if (loot) {
                items.push(loot);
            }
        }
    }

    // 40% chance for equipment
    if (Math.random() < 0.4 && typeof rollEquipmentDrop === 'function') {
        const item = rollEquipmentDrop();
        if (item) {
            items.push(item);
        }
    }

    // Add items to inventory
    for (const item of items) {
        if (typeof addItemToInventory === 'function') {
            addItemToInventory(item);
        } else {
            player.inventory.push(item);
        }
        if (typeof addMessage === 'function') {
            addMessage(`Found ${item.name}!`);
        }
    }

    if (items.length === 0 && typeof addMessage === 'function') {
        addMessage('The chest was empty...');
    }

    chest.interactable = false;
    chest.type = chest.type.replace('chest', 'chest_open');
    return true;
}

// ============================================================================
// BATCH DECORATION
// ============================================================================

/**
 * Decorate all rooms
 */
function decorateAllRooms() {
    if (!game.rooms) return;
    
    // Clear existing decorations
    game.decorations = [];
    
    for (const room of game.rooms) {
        decorateRoom(room);
    }
    
    console.log(`[Decorator] Total decorations: ${game.decorations.length}`);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.DECORATOR_CONFIG = DECORATOR_CONFIG;
    window.ELEMENT_DECORATIONS = ELEMENT_DECORATIONS;
    window.decorateRoom = decorateRoom;
    window.placeDecoration = placeDecoration;
    window.hasBlockingDecorationAt = hasBlockingDecorationAt;
    window.getDecorationAt = getDecorationAt;
    window.getDecorationsInRoom = getDecorationsInRoom;
    window.getInteractableDecorationsNear = getInteractableDecorationsNear;
    window.interactWithDecoration = interactWithDecoration;
    window.decorateAllRooms = decorateAllRooms;
}

console.log('✅ Room decorator loaded (element-based decorations)');
