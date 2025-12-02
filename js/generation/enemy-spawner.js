// ============================================================================
// ENEMY SPAWNER - The Shifting Chasm
// ============================================================================
// Updated: Element-based spawning, uses room element to weight monster selection
// ============================================================================

// ============================================================================
// CONFIGURATION
// ============================================================================

const SPAWNER_CONFIG = {
    baseEnemiesPerRoom: 3,
    enemiesPerRoomVariance: 2,
    enemyDensity: 0.04,           // 4% of floor tiles
    minEnemiesPerRoom: 1,
    maxEnemiesPerRoom: 8,
    elementMatchBonus: 3.0,       // 3x weight for matching element
    elementPenalty: 0.3,          // 0.3x weight for opposed element
    tierWeights: {
        1: { TIER_3: 0.6, TIER_2: 0.3, TIER_1: 0.1, ELITE: 0.0 },
        3: { TIER_3: 0.5, TIER_2: 0.35, TIER_1: 0.12, ELITE: 0.03 },
        5: { TIER_3: 0.4, TIER_2: 0.35, TIER_1: 0.18, ELITE: 0.07 },
        10: { TIER_3: 0.25, TIER_2: 0.35, TIER_1: 0.25, ELITE: 0.15 }
    },
    debugLogging: true
};

// ============================================================================
// MAIN SPAWNING
// ============================================================================

/**
 * Spawn enemies for a single room based on room element
 * @param {Object} room - Room to spawn enemies in
 * @param {Array} validTiles - Pre-calculated valid spawn positions
 * @param {number} enemyCount - Override enemy count (optional)
 */
function spawnEnemiesInRoom(room, validTiles, enemyCount) {
    // Validate inputs
    if (!room) {
        console.error('[Spawner] Room is undefined');
        return;
    }
    
    // Generate valid tiles if not provided
    if (!validTiles || validTiles.length === 0) {
        validTiles = typeof getValidSpawnTiles === 'function' 
            ? getValidSpawnTiles(room)
            : generateFallbackTiles(room);
    }
    
    // Calculate enemy count if not provided
    if (!enemyCount || enemyCount <= 0) {
        enemyCount = calculateEnemyCount(room);
    }

    // Entrance rooms get fewer enemies (they have a safe chamber)
    if (room.type === 'entrance') {
        enemyCount = Math.max(1, Math.floor(enemyCount * 0.5));
        if (SPAWNER_CONFIG.debugLogging) {
            console.log(`[Spawner] Entrance room: reduced to ${enemyCount} enemies`);
        }
    }

    if (SPAWNER_CONFIG.debugLogging) {
        console.log(`[Spawner] Spawning ${enemyCount} enemies in ${room.element || 'neutral'} ${room.type} room`);
    }
    
    let spawnedCount = 0;
    const usedPositions = new Set();
    
    for (let i = 0; i < enemyCount; i++) {
        if (validTiles.length === 0) break;
        
        // Find valid spawn position (pass room for safe chamber check)
        const spawnTile = findSpawnPosition(validTiles, usedPositions, room);
        if (!spawnTile) {
            console.warn(`[Spawner] Could not find spawn position for enemy ${i + 1}`);
            continue;
        }
        
        usedPositions.add(`${spawnTile.x},${spawnTile.y}`);
        
        // Select monster type based on room element
        const monsterType = selectMonsterForRoom(room);
        if (!monsterType) {
            console.warn('[Spawner] Could not select monster type');
            continue;
        }
        
        // Create and spawn enemy
        const enemy = createEnemy(monsterType, spawnTile.x, spawnTile.y, room);
        if (enemy) {
            game.enemies.push(enemy);
            spawnedCount++;

            // Initialize animation state
            if (typeof initEnemyAnimation === 'function') {
                initEnemyAnimation(enemy);
            }

            // Register with AI system
            if (typeof AIManager !== 'undefined') {
                AIManager.registerEnemy(enemy);
            }
        }
    }
    
    if (SPAWNER_CONFIG.debugLogging) {
        console.log(`[Spawner] Successfully spawned ${spawnedCount}/${enemyCount} enemies`);
    }
}

// ============================================================================
// MONSTER SELECTION
// ============================================================================

/**
 * Select a monster type appropriate for the room
 */
function selectMonsterForRoom(room) {
    if (typeof MONSTER_DATA === 'undefined') {
        console.error('[Spawner] MONSTER_DATA not loaded');
        return null;
    }
    
    const roomElement = room.element || 'physical';
    const floorNumber = game.floor || 1;
    
    // Get tier weights for current floor
    const tierWeights = getTierWeightsForFloor(floorNumber);
    
    // Build weighted monster list
    const candidates = [];
    
    for (const [monsterId, monsterData] of Object.entries(MONSTER_DATA)) {
        let weight = 1.0;
        
        // Tier weight
        const tier = monsterData.tier || 'TIER_3';
        weight *= tierWeights[tier] || 0.1;
        
        // Element matching
        const monsterElement = monsterData.element || 'physical';
        
        if (monsterElement === roomElement) {
            // Same element: big bonus
            weight *= SPAWNER_CONFIG.elementMatchBonus;
        } else if (typeof isOpposed === 'function' && isOpposed(monsterElement, roomElement)) {
            // Opposed element: penalty (but still possible)
            weight *= SPAWNER_CONFIG.elementPenalty;
        } else if (typeof isComplementary === 'function' && isComplementary(monsterElement, roomElement)) {
            // Complementary: small bonus
            weight *= 1.5;
        }
        
        // Room native bonus
        if (monsterData.rooms?.native?.includes(room.theme)) {
            weight *= 2.0;
        }
        
        // Room penalty
        if (monsterData.rooms?.penalty?.includes(room.theme)) {
            weight *= 0.5;
        }
        
        // Room hostile (won't spawn)
        if (monsterData.rooms?.hostile?.includes(room.theme)) {
            continue;
        }
        
        if (weight > 0) {
            candidates.push({ id: monsterId, data: monsterData, weight: weight });
        }
    }
    
    if (candidates.length === 0) {
        console.warn('[Spawner] No valid monster candidates');
        return null;
    }
    
    // Weighted random selection
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    let roll = Math.random() * totalWeight;
    
    for (const candidate of candidates) {
        roll -= candidate.weight;
        if (roll <= 0) {
            return candidate.id;
        }
    }
    
    return candidates[0].id;
}

/**
 * Get tier weights based on floor number
 */
function getTierWeightsForFloor(floor) {
    // Find closest floor threshold
    const thresholds = Object.keys(SPAWNER_CONFIG.tierWeights).map(Number).sort((a, b) => a - b);
    let weights = SPAWNER_CONFIG.tierWeights[1];
    
    for (const threshold of thresholds) {
        if (floor >= threshold) {
            weights = SPAWNER_CONFIG.tierWeights[threshold];
        }
    }
    
    return weights;
}

// ============================================================================
// ENEMY CREATION
// ============================================================================

/**
 * Create an enemy entity from monster data
 */
function createEnemy(monsterType, x, y, room) {
    const template = typeof MONSTER_DATA !== 'undefined' ? MONSTER_DATA[monsterType] : null;
    
    if (!template) {
        console.error(`[Spawner] Unknown monster type: ${monsterType}`);
        return null;
    }
    
    // Get tier data
    const tierData = typeof getMonsterAIConfig === 'function' 
        ? getMonsterAIConfig(monsterType)
        : null;
    
    const tierIndicator = typeof getTierIndicator === 'function'
        ? getTierIndicator(monsterType)
        : { indicator: '?', color: '#888888' };
    
    // Apply tier multipliers to stats
    const stats = typeof applyTierMultipliers === 'function'
        ? applyTierMultipliers(template, monsterType)
        : { ...template.stats };
    
    // Random facing direction
    const directions = ['up', 'down', 'left', 'right'];
    const facing = directions[Math.floor(Math.random() * directions.length)];
    
    // Generate unique ID
    const uniqueId = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const enemy = {
        // Identity
        id: uniqueId,
        name: monsterType,
        typeId: monsterType,
        
        // Tier info
        tier: template.tier || 'TIER_3',
        tierIndicator: tierIndicator.indicator,
        tierColor: tierIndicator.color,
        
        // Position
        gridX: x,
        gridY: y,
        x: x,
        y: y,
        displayX: x,
        displayY: y,
        targetGridX: x,
        targetGridY: y,
        
        // Movement
        isMoving: false,
        moveProgress: 0,
        moveSpeed: stats.speed || template.movement?.baseSpeed || 3,
        facing: facing,
        
        // Stats
        hp: stats.health || 50,
        maxHp: stats.health || 50,
        damage: stats.damage || 10,
        defense: stats.defense || 0,
        pDef: stats.defense || 0,
        
        // Element
        element: template.element || 'physical',
        armorType: template.armorType || 'unarmored',
        damageType: template.damageType || 'physical',
        
        // Behavior
	behaviorType: determineBehaviorType(template),
        behavior: createBehaviorObject(template),
        state: 'idle',
        
        // Perception
        perception: template.perception || { sightRange: 6, hearingRange: 4 },
        aggression: template.perception?.sightRange || 6,
        
        // Room reference
        room: room,
        spawnRoom: room,
        
        // Combat - use individual monster values from tierData (via buildCombatConfig)
        combat: {
            isInCombat: false,
            currentTarget: null,
            attackCooldown: 0,
            attackSpeed: tierData?.combat?.attackSpeed || 2.0,
            autoRetaliate: true,
            attackRange: tierData?.combat?.attackRange || 1
        },
        
        // Loot
        loot: template.loot || { goldMin: 5, goldMax: 15 },
        goldMin: template.loot?.goldMin || 5,
        goldMax: template.loot?.goldMax || 15,
        xp: calculateMonsterXP(template),
        
        // Status
        statusEffects: [],
        isUndead: template.isUndead || template.element === 'death',
        
        // Social
        social: template.social || {},
        packId: null,
        swarmId: null,
        commandedBy: null,
        
        // AI will be set by AIManager.registerEnemy()
        ai: null
    };
    
    if (SPAWNER_CONFIG.debugLogging) {
        console.log(`[Spawner] Created ${monsterType} (${enemy.tier}) at (${x}, ${y}) - ${enemy.element}`);
    }
    
    return enemy;
}

/**
 * Calculate XP reward for monster
 */
function calculateMonsterXP(template) {
    const tierXP = {
        'TIER_3': 10,
        'TIER_2': 25,
        'TIER_1': 50,
        'ELITE': 100,
        'BOSS': 500
    };
    const base = tierXP[template.tier] || 15;
    
    // Bonus for stronger stats
    const healthBonus = Math.floor((template.stats?.health || 50) / 25);
    
    return base + healthBonus;
}

// ============================================================================
// SPAWN POSITION HELPERS
// ============================================================================

/**
 * Calculate number of enemies for a room
 */
function calculateEnemyCount(room) {
    const area = (room.floorWidth || 20) * (room.floorHeight || 20);
    
    // Base count from area
    let count = Math.floor(area * SPAWNER_CONFIG.enemyDensity);
    
    // Add variance
    count += SPAWNER_CONFIG.baseEnemiesPerRoom;
    count += Math.floor(Math.random() * SPAWNER_CONFIG.enemiesPerRoomVariance);
    
    // Room type modifiers
    if (room.type === 'boss') count = 1; // Boss rooms have one boss
    if (room.type === 'treasure') count = Math.ceil(count * 0.5);
    if (room.type === 'shrine') count = Math.ceil(count * 0.3);
    
    // Floor scaling
    const floorBonus = Math.floor((game.floor || 1) / 3);
    count += floorBonus;
    
    // Clamp
    count = Math.max(SPAWNER_CONFIG.minEnemiesPerRoom, count);
    count = Math.min(SPAWNER_CONFIG.maxEnemiesPerRoom, count);
    
    return count;
}

/**
 * Find a valid spawn position
 * @param {Array} validTiles - Array of valid tiles
 * @param {Set} usedPositions - Already used positions
 * @param {Object} room - Room being spawned in (optional, for safe chamber check)
 */
function findSpawnPosition(validTiles, usedPositions, room) {
    const maxAttempts = 20;

    for (let i = 0; i < maxAttempts; i++) {
        const tile = validTiles[Math.floor(Math.random() * validTiles.length)];
        const key = `${tile.x},${tile.y}`;

        if (usedPositions.has(key)) continue;

        // Verify tile is still valid
        const mapTile = game.map[tile.y]?.[tile.x];
        if (!mapTile || mapTile.type !== 'floor') continue;

        // Check for blocking decorations
        if (typeof hasBlockingDecorationAt === 'function' && hasBlockingDecorationAt(tile.x, tile.y)) {
            continue;
        }

        // Check for existing enemies
        const hasEnemy = game.enemies.some(e =>
            Math.floor(e.gridX) === tile.x && Math.floor(e.gridY) === tile.y
        );
        if (hasEnemy) continue;

        // Check for player
        if (game.player && game.player.gridX === tile.x && game.player.gridY === tile.y) {
            continue;
        }

        // Don't spawn in safe chamber of entrance room
        if (room && room.type === 'entrance' && typeof isInSafeChamber === 'function') {
            if (isInSafeChamber(room, tile.x, tile.y)) {
                continue;
            }
        }

        return tile;
    }

    return null;
}

/**
 * Generate fallback tiles for room
 */
function generateFallbackTiles(room) {
    const tiles = [];
    const margin = 2;
    
    for (let dy = margin; dy < (room.floorHeight || 20) - margin; dy++) {
        for (let dx = margin; dx < (room.floorWidth || 20) - margin; dx++) {
            tiles.push({
                x: (room.floorX || room.x + 1) + dx,
                y: (room.floorY || room.y + 1) + dy
            });
        }
    }
    
    return tiles;
}

// ============================================================================
// BATCH SPAWNING
// ============================================================================

/**
 * Spawn enemies for all rooms
 */
function spawnEnemiesForAllRooms() {
    if (!game.rooms) return;
    
    let totalSpawned = 0;
    
    for (const room of game.rooms) {
        const countBefore = game.enemies.length;
        spawnEnemiesInRoom(room);
        totalSpawned += game.enemies.length - countBefore;
    }
    
    // Initialize social groups
    if (typeof MonsterSocialSystem !== 'undefined') {
        MonsterSocialSystem.scanAndFormGroups();
    }
    
    console.log(`[Spawner] Total enemies spawned: ${totalSpawned}`);
}

/**
 * Determine behavior type from monster template
 */
function determineBehaviorType(template) {
    // If template has behavior.type, use it
    if (template.behavior?.type) {
        return template.behavior.type;
    }
    
    // Otherwise, infer from aggression level
    const aggression = template.aggression || 2;
    const moveInterval = template.moveInterval || 2;
    
    if (aggression >= 5) return 'aggressive';
    if (aggression >= 3) return 'territorial';
    if (aggression <= 1) return 'passive';
    if (moveInterval >= 3) return 'patrol';
    
    return 'territorial'; // Default
}

/**
 * Create behavior object from monster template
 */
function createBehaviorObject(template) {
    if (template.behavior) {
        return template.behavior;
    }
    
    // Create behavior object from old schema
    const behaviorType = determineBehaviorType(template);
    
    return {
        type: behaviorType,
        aggression: template.aggression || 2,
        moveInterval: template.moveInterval || 2,
        chaseRange: (template.aggression || 2) * 3,
        retreatThreshold: 0.2
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.SPAWNER_CONFIG = SPAWNER_CONFIG;
    window.spawnEnemiesInRoom = spawnEnemiesInRoom;
    window.selectMonsterForRoom = selectMonsterForRoom;
    window.createEnemy = createEnemy;
    window.calculateEnemyCount = calculateEnemyCount;
    window.spawnEnemiesForAllRooms = spawnEnemiesForAllRooms;
}

console.log('✅ Enemy spawner loaded (element-based selection)');
