// ============================================================================
// ENEMY SPAWNER - The Shifting Chasm
// ============================================================================
// Updated: Element-based spawning, uses room element to weight monster selection
// ============================================================================

// ============================================================================
// CONFIGURATION
// ============================================================================

const SPAWNER_CONFIG = {
    baseEnemiesPerRoom: 3,        // Tripled from 1 for more action
    enemiesPerRoomVariance: 3,    // Tripled from 1 - variance (0-6 enemies)
    enemyDensity: 0.06,           // Tripled from 2% to 6% of floor tiles
    minEnemiesPerRoom: 1,         // At least 1 enemy per room
    maxEnemiesPerRoom: 9,         // Tripled from 3 - max 9 enemies per room
    elementMatchBonus: 3.0,       // 3x weight for matching element
    elementPenalty: 0.3,          // 0.3x weight for opposed element
    // Minimum spacing between enemies (prevents clumping)
    minEnemySpacing: 2,           // Enemies must be at least 2 tiles apart
    maxSpawnAttempts: 30,         // Increased attempts to accommodate spacing
    // Distance-based tier weights
    // Room difficulty 1-10: 1-3 = near entrance, 4-6 = mid, 7-10 = far
    difficultyTierWeights: {
        near:   { TIER_3: 0.80, TIER_2: 0.18, TIER_1: 0.02, ELITE: 0.00 },  // difficulty 1-3
        mid:    { TIER_3: 0.50, TIER_2: 0.35, TIER_1: 0.12, ELITE: 0.03 },  // difficulty 4-6
        far:    { TIER_3: 0.25, TIER_2: 0.35, TIER_1: 0.30, ELITE: 0.10 }   // difficulty 7-10
    },
    // Spawn pattern settings
    useSpawnPatterns: true,       // Enable tactical spawn patterns
    patternChance: 0.6,           // 60% chance to use a pattern (vs random)
    debugLogging: false
};

// ============================================================================
// SPAWN PATTERNS
// ============================================================================
// Defines tactical spawn configurations for interesting encounters

const SPAWN_PATTERNS = {
    // Patrol: Enemies along walls (patrolling the perimeter)
    patrol: {
        name: 'patrol',
        description: 'Enemies patrol along walls',
        monsterAffinity: ['territorial', 'patrol'],  // Monsters that prefer this pattern
        roomAffinity: ['combat', 'corridor'],        // Room types that prefer this
        weight: 1.0
    },

    // Ambush: Enemies hidden behind cover or in corners
    ambush: {
        name: 'ambush',
        description: 'Enemies wait in ambush positions',
        monsterAffinity: ['aggressive', 'predator'],
        roomAffinity: ['treasure', 'combat'],
        weight: 1.2
    },

    // Guard: Enemies clustered around important features
    guard: {
        name: 'guard',
        description: 'Enemies guard a central point',
        monsterAffinity: ['defensive', 'territorial'],
        roomAffinity: ['treasure', 'shrine'],
        weight: 1.5
    },

    // Cluster: Enemies grouped together for pack tactics
    cluster: {
        name: 'cluster',
        description: 'Enemies form a tight group',
        monsterAffinity: ['pack', 'swarm'],
        roomAffinity: ['combat', 'entrance'],
        weight: 0.8
    },

    // Scattered: Enemies spread out (default/fallback)
    scattered: {
        name: 'scattered',
        description: 'Enemies spread throughout room',
        monsterAffinity: [],  // No specific affinity
        roomAffinity: [],
        weight: 1.0
    }
};

/**
 * Select a spawn pattern for a room based on room type and monster types
 * @param {Object} room - Room object
 * @param {Array} monsterTypes - Array of monster type IDs that will spawn
 * @returns {Object} Selected spawn pattern
 */
function selectSpawnPattern(room, monsterTypes) {
    // If patterns disabled, return scattered
    if (!SPAWNER_CONFIG.useSpawnPatterns) {
        return SPAWN_PATTERNS.scattered;
    }

    // Random chance to use pattern vs scattered
    if (Math.random() > SPAWNER_CONFIG.patternChance) {
        return SPAWN_PATTERNS.scattered;
    }

    // Calculate weights for each pattern
    const weights = [];

    for (const [patternName, pattern] of Object.entries(SPAWN_PATTERNS)) {
        let weight = pattern.weight;

        // Room type affinity bonus
        if (pattern.roomAffinity.includes(room.type)) {
            weight *= 2.0;
        }

        // Monster behavior affinity (check if any monster has this behavior)
        if (monsterTypes && monsterTypes.length > 0 && typeof MONSTER_DATA !== 'undefined') {
            for (const monsterId of monsterTypes) {
                const monster = MONSTER_DATA[monsterId];
                if (monster?.behavior?.type && pattern.monsterAffinity.includes(monster.behavior.type)) {
                    weight *= 1.5;
                    break;
                }
            }
        }

        weights.push({ pattern, weight });
    }

    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const { pattern, weight } of weights) {
        roll -= weight;
        if (roll <= 0) {
            if (SPAWNER_CONFIG.debugLogging) {
                console.log(`[Spawner] Selected pattern: ${pattern.name}`);
            }
            return pattern;
        }
    }

    return SPAWN_PATTERNS.scattered;
}

/**
 * Find positions for a spawn pattern
 * @param {string} patternName - Pattern name
 * @param {Object} room - Room object
 * @param {Array} validTiles - Valid spawn tiles
 * @param {number} count - Number of positions needed
 * @returns {Array} Array of {x, y} positions
 */
function getPatternPositions(patternName, room, validTiles, count) {
    if (!validTiles || validTiles.length === 0) return [];

    switch (patternName) {
        case 'patrol':
            return getPatrolPositions(room, validTiles, count);
        case 'ambush':
            return getAmbushPositions(room, validTiles, count);
        case 'guard':
            return getGuardPositions(room, validTiles, count);
        case 'cluster':
            return getClusterPositions(room, validTiles, count);
        case 'scattered':
        default:
            return []; // Use standard random spawning
    }
}

/**
 * Get patrol positions (along walls)
 */
function getPatrolPositions(room, validTiles, count) {
    const positions = [];
    const floorX = room.floorX || room.x + 1;
    const floorY = room.floorY || room.y + 1;
    const width = room.floorWidth || (room.width - 2);
    const height = room.floorHeight || (room.height - 2);

    // Filter tiles near walls (within 2 tiles of edge)
    const wallTiles = validTiles.filter(tile => {
        const localX = tile.x - floorX;
        const localY = tile.y - floorY;
        return localX <= 2 || localX >= width - 3 ||
               localY <= 2 || localY >= height - 3;
    });

    // Shuffle and pick
    const shuffled = wallTiles.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        positions.push(shuffled[i]);
    }

    return positions;
}

/**
 * Get ambush positions (corners and behind obstacles)
 */
function getAmbushPositions(room, validTiles, count) {
    const positions = [];
    const floorX = room.floorX || room.x + 1;
    const floorY = room.floorY || room.y + 1;
    const width = room.floorWidth || (room.width - 2);
    const height = room.floorHeight || (room.height - 2);

    // Score tiles by "ambush potential" (corners and edges)
    const scoredTiles = validTiles.map(tile => {
        const localX = tile.x - floorX;
        const localY = tile.y - floorY;

        let score = 0;

        // Corners are best
        const isCorner = (localX <= 2 || localX >= width - 3) &&
                         (localY <= 2 || localY >= height - 3);
        if (isCorner) score += 10;

        // Near edges is good
        const nearEdge = localX <= 3 || localX >= width - 4 ||
                         localY <= 3 || localY >= height - 4;
        if (nearEdge) score += 5;

        // Check for adjacent walls (cover)
        const hasAdjacentWall = checkAdjacentWalls(tile.x, tile.y);
        if (hasAdjacentWall) score += 8;

        return { tile, score };
    });

    // Sort by score and pick top positions
    scoredTiles.sort((a, b) => b.score - a.score);

    for (let i = 0; i < Math.min(count, scoredTiles.length); i++) {
        if (scoredTiles[i].score > 0) {
            positions.push(scoredTiles[i].tile);
        }
    }

    return positions;
}

/**
 * Get guard positions (around room center or special feature)
 */
function getGuardPositions(room, validTiles, count) {
    const positions = [];
    const floorX = room.floorX || room.x + 1;
    const floorY = room.floorY || room.y + 1;
    const width = room.floorWidth || (room.width - 2);
    const height = room.floorHeight || (room.height - 2);

    // Find center point (or shrine location if available)
    let guardX = floorX + Math.floor(width / 2);
    let guardY = floorY + Math.floor(height / 2);

    // Score tiles by distance from guard point (prefer 3-5 tiles away)
    const scoredTiles = validTiles.map(tile => {
        const dist = Math.abs(tile.x - guardX) + Math.abs(tile.y - guardY);
        // Ideal distance is 3-5 tiles
        const score = dist >= 3 && dist <= 5 ? 10 : (dist < 3 ? 3 : Math.max(0, 10 - dist));
        return { tile, score };
    });

    // Sort by score (best guard positions first)
    scoredTiles.sort((a, b) => b.score - a.score);

    // Pick positions spaced around the guard point
    const usedAngles = [];
    for (const { tile, score } of scoredTiles) {
        if (positions.length >= count) break;
        if (score <= 0) continue;

        // Calculate angle from center
        const angle = Math.atan2(tile.y - guardY, tile.x - guardX);
        const angleDeg = (angle * 180 / Math.PI + 180) % 360;

        // Check if we already have a position at a similar angle (within 45 degrees)
        const tooClose = usedAngles.some(a => Math.abs(a - angleDeg) < 45 ||
                                              Math.abs(a - angleDeg + 360) < 45 ||
                                              Math.abs(a - angleDeg - 360) < 45);

        if (!tooClose || positions.length < 2) {
            positions.push(tile);
            usedAngles.push(angleDeg);
        }
    }

    return positions;
}

/**
 * Get cluster positions (tight group)
 */
function getClusterPositions(room, validTiles, count) {
    const positions = [];
    if (validTiles.length === 0) return positions;

    // Pick a random anchor point
    const anchor = validTiles[Math.floor(Math.random() * validTiles.length)];

    // Sort tiles by distance from anchor
    const sortedTiles = [...validTiles].sort((a, b) => {
        const distA = Math.abs(a.x - anchor.x) + Math.abs(a.y - anchor.y);
        const distB = Math.abs(b.x - anchor.x) + Math.abs(b.y - anchor.y);
        return distA - distB;
    });

    // Take the closest tiles (but still respect min spacing)
    for (let i = 0; i < Math.min(count, sortedTiles.length); i++) {
        positions.push(sortedTiles[i]);
    }

    return positions;
}

/**
 * Check if a position has adjacent walls (for ambush scoring)
 */
function checkAdjacentWalls(x, y) {
    if (!game.map) return false;

    const directions = [
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
    ];

    for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        const tile = game.map[ny]?.[nx];
        if (tile && (tile.type === 'wall' || tile.type === 'interior_wall' || tile.blocked)) {
            return true;
        }
    }

    return false;
}

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

    // Pre-select monster types to inform pattern selection
    const monsterTypes = [];
    for (let i = 0; i < enemyCount; i++) {
        const type = selectMonsterForRoom(room);
        if (type) monsterTypes.push(type);
    }

    // Select spawn pattern based on room and monsters
    const pattern = selectSpawnPattern(room, monsterTypes);

    // Get pattern-specific positions (or empty array for scattered/default)
    let patternPositions = getPatternPositions(pattern.name, room, validTiles, enemyCount);

    if (SPAWNER_CONFIG.debugLogging && pattern.name !== 'scattered') {
        console.log(`[Spawner] Using ${pattern.name} pattern: ${patternPositions.length} positions`);
    }

    let spawnedCount = 0;
    const usedPositions = new Set();
    const spawnedPositions = [];  // Track positions for minimum spacing
    let patternIndex = 0;

    for (let i = 0; i < enemyCount; i++) {
        if (validTiles.length === 0) break;

        let spawnTile;

        // Try to use pattern position first
        if (patternPositions.length > 0 && patternIndex < patternPositions.length) {
            const patternPos = patternPositions[patternIndex++];
            const key = `${patternPos.x},${patternPos.y}`;

            // Verify pattern position is still valid
            if (!usedPositions.has(key) &&
                respectsMinSpacing(patternPos.x, patternPos.y, spawnedPositions, SPAWNER_CONFIG.minEnemySpacing)) {
                spawnTile = patternPos;
            }
        }

        // Fallback to random position if pattern position invalid or unavailable
        if (!spawnTile) {
            spawnTile = findSpawnPosition(validTiles, usedPositions, room, spawnedPositions);
        }

        if (!spawnTile) {
            console.warn(`[Spawner] Could not find spawn position for enemy ${i + 1}`);
            continue;
        }

        usedPositions.add(`${spawnTile.x},${spawnTile.y}`);
        spawnedPositions.push({ x: spawnTile.x, y: spawnTile.y });

        // Use pre-selected monster type
        const monsterType = monsterTypes[i] || selectMonsterForRoom(room);
        if (!monsterType) {
            console.warn('[Spawner] Could not select monster type');
            continue;
        }

        // Create and spawn enemy using unified EnemyFactory
        const enemy = typeof EnemyFactory !== 'undefined'
            ? EnemyFactory.createAndRegister({
                monsterType: monsterType,
                x: spawnTile.x,
                y: spawnTile.y,
                room: room,
                spawnPattern: pattern.name  // Track which pattern was used
            })
            : createEnemyLegacy(monsterType, spawnTile.x, spawnTile.y, room);

        if (enemy) {
            // Set spawn pattern on enemy for AI behavior hints
            enemy.spawnPattern = pattern.name;
            game.enemies.push(enemy);
            spawnedCount++;
        }
    }

    if (SPAWNER_CONFIG.debugLogging) {
        console.log(`[Spawner] Successfully spawned ${spawnedCount}/${enemyCount} enemies (pattern: ${pattern.name})`);
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

    // Get room difficulty (1-10, based on distance from entrance)
    // Check blob difficulty first, then elementPower, then default to 5
    const roomDifficulty = room.blob?.difficulty || room.elementPower || 5;

    // Get tier weights based on room difficulty (distance from entrance)
    const tierWeights = getTierWeightsForDifficulty(roomDifficulty, floorNumber);
    
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
 * Get tier weights based on room difficulty (distance from entrance)
 * Rooms near entrance spawn mostly weak enemies, far rooms spawn stronger ones
 * @param {number} difficulty - Room difficulty 1-10 (from blob.difficulty)
 * @param {number} floor - Current floor number (for additional scaling)
 */
function getTierWeightsForDifficulty(difficulty, floor) {
    const cfg = SPAWNER_CONFIG.difficultyTierWeights;

    // Determine difficulty bracket
    let baseWeights;
    if (difficulty <= 3) {
        baseWeights = cfg.near;   // Near entrance: mostly TIER_3
    } else if (difficulty <= 6) {
        baseWeights = cfg.mid;    // Mid-range: balanced mix
    } else {
        baseWeights = cfg.far;    // Far from entrance: stronger enemies
    }

    // Apply floor scaling for higher floors (slight increase to stronger tiers)
    if (floor > 1) {
        const floorBonus = Math.min(0.15, (floor - 1) * 0.03); // Max 15% shift at floor 6+

        return {
            TIER_3: Math.max(0.1, baseWeights.TIER_3 - floorBonus),
            TIER_2: baseWeights.TIER_2,
            TIER_1: baseWeights.TIER_1 + floorBonus * 0.6,
            ELITE: Math.min(0.2, baseWeights.ELITE + floorBonus * 0.4)
        };
    }

    return { ...baseWeights };
}

// ============================================================================
// FLOOR-BASED STAT SCALING
// ============================================================================

/**
 * Scale enemy stats by floor level
 * @param {Object} template - Base monster template
 * @param {string} monsterType - Monster type name
 * @param {number} floor - Current dungeon floor (1-10)
 * @returns {Object} Scaled stats
 */
function applyTierMultipliers(template, monsterType, floor) {
    // Floor scaling: 15% more HP/damage per floor
    const floorScale = 1 + (floor - 1) * 0.15;
    // Floor 1 = 1.0x, Floor 5 = 1.6x, Floor 10 = 2.35x

    return {
        ...template,
        hp: Math.floor((template.hp || 50) * floorScale),
        maxHp: Math.floor((template.hp || 50) * floorScale),
        str: Math.floor((template.str || 10) * floorScale),
        damage: Math.floor((template.damage || 8) * floorScale),
        defense: Math.floor((template.defense || 2) * (1 + (floor - 1) * 0.10)),
        xpValue: Math.floor((template.xpValue || 10) * floorScale)
    };
}

// ============================================================================
// ENEMY CREATION (LEGACY - Use EnemyFactory.createAndRegister() instead)
// ============================================================================

/**
 * Create an enemy entity from monster data
 * @deprecated Use EnemyFactory.createAndRegister() instead for unified enemy creation
 * This function is kept as a fallback if EnemyFactory is not loaded
 */
function createEnemyLegacy(monsterType, x, y, room) {
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

    // Get current floor for stat scaling (monsters level up with floor)
    const currentFloor = (typeof game !== 'undefined' && game.floor) ? game.floor : 1;

    // Apply floor-based stat scaling
    // Monster level = floor number (Floor 1 = Level 1, etc.)
    const stats = typeof applyTierMultipliers === 'function'
        ? applyTierMultipliers(template, monsterType, currentFloor)
        : { ...template };

    // Debug logging for floor scaling
    if (SPAWNER_CONFIG.debugLogging) {
        console.log(`[Spawner] Creating ${monsterType} on Floor ${currentFloor}, level: ${stats.level || currentFloor}`);
    }

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

        // Collision
        blockingRadius: template.elite ? 1.0 : 0.75,

        // Monster level (ALWAYS equal to floor number for consistency)
        level: currentFloor,

        // Stats (scaled by floor level)
        hp: stats.hp || 50,
        maxHp: stats.hp || 50,
        str: stats.str || 10,
        agi: stats.agi || 10,
        int: stats.int || 10,
        pDef: stats.pDef || 0,
        mDef: stats.mDef || 0,

        // Mana (scales with INT, magic monsters have more)
        mp: calculateMonsterMana(template),
        maxMp: calculateMonsterMana(template),
        manaRegen: calculateMonsterManaRegen(template),

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
            attackRange: tierData?.combat?.attackRange || 1,
            comboCount: 1  // Enemy combo system: 1 -> 2 -> 3 (special) -> 1
        },

        // Loot (favor-based system - no gold)
        loot: template.loot || [],
        xp: stats.xp || calculateMonsterXP(template),
        
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

    // Journal/Codex tracking - discover monster type
    if (typeof discoverMonster === 'function') {
        discoverMonster(monsterType);
    }

    return enemy;
}

/**
 * Calculate XP reward for monster
 * Uses the monster's base XP from MONSTER_DATA - tiers do NOT affect XP
 */
function calculateMonsterXP(template) {
    // Use the monster's defined XP from MONSTER_DATA
    // Tiers only affect behavior/AI, not rewards
    return template.xp || 20;
}

/**
 * Calculate monster mana pool based on INT stat
 * Magic monsters have significantly more mana
 */
function calculateMonsterMana(template) {
    const intStat = template.int || 10;
    const isMagic = template.attackType === 'magic';

    // Base mana: 50 + INT bonus
    // Magic monsters get 2x bonus
    const baseMana = 50;
    const intBonus = Math.floor(intStat * (isMagic ? 3 : 1));

    return baseMana + intBonus;
}

/**
 * Calculate monster mana regeneration rate
 * Based on INT, magic monsters regen faster
 */
function calculateMonsterManaRegen(template) {
    const intStat = template.int || 10;
    const isMagic = template.attackType === 'magic';

    // Base regen: 2/sec, scales with INT
    const baseRegen = 2;
    const intBonus = Math.floor(intStat / 10);

    return baseRegen + intBonus + (isMagic ? 2 : 0);
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
 * Calculate Chebyshev distance (chessboard distance) between two positions
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
function getDistance(x1, y1, x2, y2) {
    return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

/**
 * Check if a position respects minimum spacing from existing enemy positions
 * @param {number} x - Candidate X position
 * @param {number} y - Candidate Y position
 * @param {Array} spawnedPositions - Array of {x, y} positions of already spawned enemies
 * @param {number} minSpacing - Minimum distance required between enemies
 * @returns {boolean} True if spacing requirement is met
 */
function respectsMinSpacing(x, y, spawnedPositions, minSpacing) {
    for (const pos of spawnedPositions) {
        const dist = getDistance(x, y, pos.x, pos.y);
        if (dist < minSpacing) {
            return false;
        }
    }
    return true;
}

/**
 * Find a valid spawn position with minimum spacing enforcement
 * @param {Array} validTiles - Array of valid tiles
 * @param {Set} usedPositions - Already used positions (for exact duplicates)
 * @param {Object} room - Room being spawned in (optional, for safe chamber check)
 * @param {Array} spawnedPositions - Array of {x, y} positions of already spawned enemies
 */
function findSpawnPosition(validTiles, usedPositions, room, spawnedPositions = []) {
    const maxAttempts = SPAWNER_CONFIG.maxSpawnAttempts || 30;
    const minSpacing = SPAWNER_CONFIG.minEnemySpacing || 2;

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

        // Check for existing enemies in game.enemies
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

        // Enforce minimum spacing from already spawned enemies in this batch
        if (!respectsMinSpacing(tile.x, tile.y, spawnedPositions, minSpacing)) {
            continue;
        }

        // Also check spacing against existing game.enemies
        const existingPositions = game.enemies.map(e => ({
            x: Math.floor(e.gridX),
            y: Math.floor(e.gridY)
        }));
        if (!respectsMinSpacing(tile.x, tile.y, existingPositions, minSpacing)) {
            continue;
        }

        return tile;
    }

    // If we can't find a position with proper spacing, try without spacing as fallback
    // This ensures we don't completely block spawning in dense rooms
    if (SPAWNER_CONFIG.debugLogging) {
        console.log('[Spawner] Could not satisfy spacing, trying without spacing requirement');
    }

    for (let i = 0; i < 10; i++) {
        const tile = validTiles[Math.floor(Math.random() * validTiles.length)];
        const key = `${tile.x},${tile.y}`;

        if (usedPositions.has(key)) continue;

        const mapTile = game.map[tile.y]?.[tile.x];
        if (!mapTile || mapTile.type !== 'floor') continue;

        const hasEnemy = game.enemies.some(e =>
            Math.floor(e.gridX) === tile.x && Math.floor(e.gridY) === tile.y
        );
        if (hasEnemy) continue;

        if (game.player && game.player.gridX === tile.x && game.player.gridY === tile.y) {
            continue;
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
    window.SPAWN_PATTERNS = SPAWN_PATTERNS;
    window.spawnEnemiesInRoom = spawnEnemiesInRoom;
    window.selectMonsterForRoom = selectMonsterForRoom;
    window.selectSpawnPattern = selectSpawnPattern;
    window.getPatternPositions = getPatternPositions;
    // Prefer EnemyFactory for enemy creation, fallback to legacy
    window.createEnemy = typeof EnemyFactory !== 'undefined'
        ? (monsterType, x, y, room) => EnemyFactory.createAndRegister({ monsterType, x, y, room })
        : createEnemyLegacy;
    window.createEnemyLegacy = createEnemyLegacy;
    window.calculateEnemyCount = calculateEnemyCount;
    window.spawnEnemiesForAllRooms = spawnEnemiesForAllRooms;
    // Override the disabled version from monster-tiers.js with actual floor scaling
    window.applyTierMultipliers = applyTierMultipliers;
}

// Enemy spawner loaded (element-based selection, spawn patterns, uses EnemyFactory)
