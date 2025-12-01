// ============================================================================
// ENEMY - The Shifting Chasm
// ============================================================================
// Updated: Aligned with new MONSTER_DATA schema, element support, AI delegation
// ============================================================================

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENEMY_CONFIG = {
    edgeMargin: 1,                // Keep enemies away from map edges
    defaultVisionRange: 6,
    defaultHearingRange: 4,
    debugLogging: false
};

// ============================================================================
// VISION & DETECTION
// ============================================================================

/**
 * Check if enemy can see the player
 * Uses perception stats from new monster schema
 */
function canSeePlayer(enemy) {
    if (!game.player || game.player.isDead) return false;
    
    // Check if player is invisible
    if (game.player.isInvisible) return false;
    
    // Get vision range from perception or fallback
    const visionRange = enemy.perception?.sightRange || enemy.aggression || ENEMY_CONFIG.defaultVisionRange;
    
    // Calculate distance
    const dx = game.player.gridX - (enemy.gridX ?? enemy.x);
    const dy = game.player.gridY - (enemy.gridY ?? enemy.y);
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > visionRange) return false;
    
    // Check if in same room (optional - some enemies can see across rooms)
    if (enemy.perception?.requiresSameRoom !== false) {
        if (!isInSameRoom(enemy, game.player)) return false;
    }
    
    // Check facing direction (cone of vision)
    if (enemy.facing && !isInVisionCone(enemy, game.player)) {
        // Not in cone, but close enemies can still detect
        if (dist > 2) return false;
    }
    
    // Line of sight check (optional)
    if (enemy.perception?.requiresLineOfSight) {
        if (!hasLineOfSight(enemy, game.player)) return false;
    }
    
    return true;
}

/**
 * Check if target is in enemy's vision cone
 */
function isInVisionCone(enemy, target) {
    const dx = (target.gridX ?? target.x) - (enemy.gridX ?? enemy.x);
    const dy = (target.gridY ?? target.y) - (enemy.gridY ?? enemy.y);
    
    const facing = enemy.facing;
    
    // Convert facing to check
    if (facing === 'up' || (facing.y === -1 && facing.x === 0)) {
        return dy < 0 && Math.abs(dx) <= Math.abs(dy);
    }
    if (facing === 'down' || (facing.y === 1 && facing.x === 0)) {
        return dy > 0 && Math.abs(dx) <= Math.abs(dy);
    }
    if (facing === 'left' || (facing.x === -1 && facing.y === 0)) {
        return dx < 0 && Math.abs(dy) <= Math.abs(dx);
    }
    if (facing === 'right' || (facing.x === 1 && facing.y === 0)) {
        return dx > 0 && Math.abs(dy) <= Math.abs(dx);
    }
    
    return true; // Default: can see all directions
}

/**
 * Check if two entities are in the same room
 */
function isInSameRoom(entity1, entity2) {
    const room1 = getEntityRoom(entity1);
    const room2 = getEntityRoom(entity2);
    
    if (!room1 || !room2) return false;
    return room1 === room2;
}

/**
 * Get the room an entity is currently in
 */
function getEntityRoom(entity) {
    if (entity.room) return entity.room;
    
    const x = entity.gridX ?? entity.x;
    const y = entity.gridY ?? entity.y;
    
    if (!game.rooms) return null;
    
    for (const room of game.rooms) {
        const rx = room.floorX ?? room.x;
        const ry = room.floorY ?? room.y;
        const rw = room.floorWidth ?? room.width;
        const rh = room.floorHeight ?? room.height;
        
        if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) {
            return room;
        }
    }
    
    return null;
}

/**
 * Simple line of sight check
 */
function hasLineOfSight(from, to) {
    const x0 = Math.floor(from.gridX ?? from.x);
    const y0 = Math.floor(from.gridY ?? from.y);
    const x1 = Math.floor(to.gridX ?? to.x);
    const y1 = Math.floor(to.gridY ?? to.y);
    
    // Bresenham's line algorithm
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    let x = x0;
    let y = y0;
    
    while (x !== x1 || y !== y1) {
        // Check if tile blocks vision (includes interior_wall from chamber generation)
        const tile = game.map?.[y]?.[x];
        if (!tile || tile.type === 'wall' || tile.type === 'void' || tile.type === 'interior_wall') {
            return false;
        }
        
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
    
    return true;
}

// ============================================================================
// LEGACY MOVEMENT (Fallback when AI not active)
// ============================================================================

/**
 * Move enemy using legacy behavior
 * Only used if enemy doesn't have new AI system
 */
function moveEnemy(enemy) {
    // If enemy has new AI system, let it handle movement
    if (enemy.ai) {
        return;
    }
    
    // Check if enemy can move (not stunned, frozen, etc.)
    if (typeof canEntityMove === 'function' && !canEntityMove(enemy)) {
        return;
    }
    
    if (!game.player) return;
    
    let dirs = [];
    
    // Check combat state
    if (enemy.combat?.isInCombat && enemy.combat.currentTarget) {
        enemy.state = 'chasing';
    }
    
    if (enemy.state === 'chasing') {
        // Check if player left the room
        if (!isInSameRoom(enemy, game.player)) {
            enemy.state = 'wandering';
            if (typeof disengageCombat === 'function') {
                disengageCombat(enemy);
            }
            return;
        }
        
        // Move toward player
        const dx = game.player.gridX - (enemy.gridX ?? enemy.x);
        const dy = game.player.gridY - (enemy.gridY ?? enemy.y);
        
        if (Math.abs(dx) > Math.abs(dy)) {
            dirs.push({ x: Math.sign(dx), y: 0 });
            dirs.push({ x: 0, y: Math.sign(dy) });
        } else {
            dirs.push({ x: 0, y: Math.sign(dy) });
            dirs.push({ x: Math.sign(dx), y: 0 });
        }
    } else {
        // Wandering - check for player
        if (canSeePlayer(enemy)) {
            enemy.state = 'chasing';
            return;
        }
        
        // Random movement
        dirs = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 }
        ].sort(() => Math.random() - 0.5);
    }
    
    // Try each direction
    for (const dir of dirs) {
        if (dir.x === 0 && dir.y === 0) continue;
        
        const nx = Math.floor((enemy.gridX ?? enemy.x) + dir.x);
        const ny = Math.floor((enemy.gridY ?? enemy.y) + dir.y);
        
        if (!isValidEnemyMove(enemy, nx, ny)) continue;
        
        // Check for player collision (start combat)
        if (game.player && nx === game.player.gridX && ny === game.player.gridY) {
            if (typeof engageCombat === 'function') {
                engageCombat(enemy, game.player);
            }
            return;
        }
        
        // Valid move
        enemy.x = nx;
        enemy.y = ny;
        enemy.gridX = nx;
        enemy.gridY = ny;
        enemy.facing = directionToFacing(dir);
        
        return;
    }
}

/**
 * Check if enemy can move to position
 */
function isValidEnemyMove(enemy, nx, ny) {
    // Bounds check
    if (nx < ENEMY_CONFIG.edgeMargin || nx >= GRID_WIDTH - ENEMY_CONFIG.edgeMargin) return false;
    if (ny < ENEMY_CONFIG.edgeMargin || ny >= GRID_HEIGHT - ENEMY_CONFIG.edgeMargin) return false;
    
    // Tile check
    const tile = typeof safeGetTile === 'function' 
        ? safeGetTile(nx, ny)
        : game.map?.[ny]?.[nx];
    
    if (!tile || tile.type !== 'floor') return false;
    
    // Room check (stay in assigned room for non-chasing)
    if (enemy.state !== 'chasing' && enemy.room && tile.room !== enemy.room) {
        return false;
    }
    
    // Decoration check
    if (typeof hasBlockingDecorationAt === 'function' && hasBlockingDecorationAt(nx, ny)) {
        return false;
    }
    
    // Hazard avoidance
    if (typeof HazardSystem !== 'undefined') {
        const hazard = HazardSystem.getHazardAt(nx, ny);
        if (hazard && HazardSystem.shouldAvoid(enemy, hazard)) {
            return false;
        }
    }
    
    // Other enemy check
    if (game.enemies.some(e => e !== enemy && Math.floor(e.gridX) === nx && Math.floor(e.gridY) === ny)) {
        return false;
    }
    
    return true;
}

/**
 * Convert direction object to facing string
 */
function directionToFacing(dir) {
    if (dir.y === -1) return 'up';
    if (dir.y === 1) return 'down';
    if (dir.x === -1) return 'left';
    if (dir.x === 1) return 'right';
    return 'down';
}

// ============================================================================
// ENEMY QUERIES
// ============================================================================

/**
 * Get all enemies within range of a position
 */
function getEnemiesInRadius(x, y, range) {
    if (!game.enemies) return [];
    
    return game.enemies.filter(enemy => {
        const ex = enemy.gridX ?? enemy.x;
        const ey = enemy.gridY ?? enemy.y;
        const dist = Math.sqrt((ex - x) ** 2 + (ey - y) ** 2);
        return dist <= range;
    });
}

/**
 * Get closest enemy to a position
 */
function getClosestEnemyTo(x, y, maxRange = Infinity) {
    if (!game.enemies || game.enemies.length === 0) return null;
    
    let closest = null;
    let minDist = maxRange;
    
    for (const enemy of game.enemies) {
        const ex = enemy.gridX ?? enemy.x;
        const ey = enemy.gridY ?? enemy.y;
        const dist = Math.sqrt((ex - x) ** 2 + (ey - y) ** 2);
        
        if (dist < minDist) {
            minDist = dist;
            closest = enemy;
        }
    }
    
    return closest;
}

/**
 * Get enemies in a specific room
 */
function getEnemiesInRoom(room) {
    if (!game.enemies || !room) return [];
    
    return game.enemies.filter(enemy => {
        const ex = enemy.gridX ?? enemy.x;
        const ey = enemy.gridY ?? enemy.y;
        const rx = room.floorX ?? room.x;
        const ry = room.floorY ?? room.y;
        const rw = room.floorWidth ?? room.width;
        const rh = room.floorHeight ?? room.height;
        
        return ex >= rx && ex < rx + rw && ey >= ry && ey < ry + rh;
    });
}

/**
 * Get enemies by element
 */
function getEnemiesByElement(element) {
    if (!game.enemies) return [];
    return game.enemies.filter(e => e.element === element);
}

/**
 * Get enemies by tier
 */
function getEnemiesByTier(tier) {
    if (!game.enemies) return [];
    return game.enemies.filter(e => e.tier === tier);
}

// ============================================================================
// ALERTING
// ============================================================================

/**
 * Alert all enemies in a room
 */
function alertEnemiesInRoom(room, target, alerter) {
    if (!game.enemies || !room) return;
    
    const roomEnemies = getEnemiesInRoom(room);
    
    for (const enemy of roomEnemies) {
        if (enemy === alerter) continue;
        if (enemy.hp <= 0) continue;
        
        // Use AI system if available
        if (enemy.ai && typeof enemy.ai.onAllyShout === 'function') {
            enemy.ai.onAllyShout(alerter, target);
        } else {
            // Legacy fallback
            enemy.state = 'chasing';
            enemy.alertedBy = alerter;
            if (target) {
                enemy.lastKnownTargetPos = { 
                    x: target.gridX ?? target.x, 
                    y: target.gridY ?? target.y 
                };
            }
        }
    }
}

/**
 * Alert enemies by sound (uses hearing range)
 */
function alertEnemiesBySound(x, y, volume, source) {
    if (!game.enemies) return;
    
    for (const enemy of game.enemies) {
        if (enemy === source) continue;
        if (enemy.hp <= 0) continue;
        
        const hearingRange = enemy.perception?.hearingRange || ENEMY_CONFIG.defaultHearingRange;
        const ex = enemy.gridX ?? enemy.x;
        const ey = enemy.gridY ?? enemy.y;
        const dist = Math.sqrt((ex - x) ** 2 + (ey - y) ** 2);
        
        // Volume decreases with distance
        const effectiveVolume = volume - (dist * 10);
        
        if (effectiveVolume > 0 && dist <= hearingRange) {
            if (enemy.ai && typeof enemy.ai.onHearNoise === 'function') {
                enemy.ai.onHearNoise(x, y, effectiveVolume);
            } else {
                enemy.state = 'alert';
                enemy.lastHeardPos = { x, y };
            }
        }
    }
}

// ============================================================================
// ELEMENT INTERACTIONS
// ============================================================================

/**
 * Get element-based damage modifier for enemy
 */
function getEnemyElementModifier(enemy, attackElement) {
    const enemyElement = enemy.element || 'physical';
    
    if (typeof getElementModifier === 'function') {
        return getElementModifier(attackElement, enemyElement);
    }
    
    if (typeof ELEMENT_MATRIX !== 'undefined' && ELEMENT_MATRIX[attackElement]) {
        return 1.0 + (ELEMENT_MATRIX[attackElement][enemyElement] || 0);
    }
    
    return 1.0;
}

/**
 * Check if enemy is in a favorable room (element match)
 */
function isEnemyInFavorableRoom(enemy) {
    const room = getEntityRoom(enemy);
    if (!room?.element) return false;
    
    return enemy.element === room.element;
}

/**
 * Get room attunement bonus for enemy
 */
function getEnemyRoomBonus(enemy) {
    const room = getEntityRoom(enemy);
    if (!room?.element) return 1.0;
    
    if (typeof getRoomAttunementModifier === 'function') {
        return getRoomAttunementModifier(enemy.element, room.element);
    }
    
    if (enemy.element === room.element) return 1.25;
    if (typeof isOpposed === 'function' && isOpposed(enemy.element, room.element)) return 0.8;
    
    return 1.0;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.ENEMY_CONFIG = ENEMY_CONFIG;
    window.canSeePlayer = canSeePlayer;
    window.isInVisionCone = isInVisionCone;
    window.isInSameRoom = isInSameRoom;
    window.getEntityRoom = getEntityRoom;
    window.hasLineOfSight = hasLineOfSight;
    window.moveEnemy = moveEnemy;
    window.isValidEnemyMove = isValidEnemyMove;
    window.getEnemiesInRadius = getEnemiesInRadius;
    window.getClosestEnemyTo = getClosestEnemyTo;
    window.getEnemiesInRoom = getEnemiesInRoom;
    window.getEnemiesByElement = getEnemiesByElement;
    window.getEnemiesByTier = getEnemiesByTier;
    window.alertEnemiesInRoom = alertEnemiesInRoom;
    window.alertEnemiesBySound = alertEnemiesBySound;
    window.getEnemyElementModifier = getEnemyElementModifier;
    window.isEnemyInFavorableRoom = isEnemyInFavorableRoom;
    window.getEnemyRoomBonus = getEnemyRoomBonus;
}

console.log('✅ Enemy system loaded (new schema, element support)');
