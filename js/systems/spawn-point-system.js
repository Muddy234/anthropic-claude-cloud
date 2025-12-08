// ============================================================================
// SPAWN POINT SYSTEM - Continuous enemy spawning from specific locations
// ============================================================================
// Handles rifts, nests, portals and other spawn points that continuously
// create enemies during shift scenarios.
// ============================================================================

const SpawnPointSystem = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    config: {
        debugLogging: false,
        globalSpawnCap: 12,        // Reduced from 30 - fewer but more meaningful encounters
        minSpawnDistance: 3        // Minimum tiles from player to spawn
    },

    // ========================================================================
    // STATE
    // ========================================================================
    spawnPoints: new Map(),       // spawnPointId -> spawn point object
    activeSpawns: new Map(),      // spawnPointId -> Set of enemy references
    totalSpawned: 0,

    // ========================================================================
    // SPAWN POINT TYPES
    // ========================================================================
    SPAWN_TYPES: {
        RIFT: 'rift',
        NEST: 'nest',
        PORTAL: 'portal',
        GRAVE: 'grave',
        HIVE: 'hive',
        SUMMONING_CIRCLE: 'summoning_circle'
    },

    // Default configurations
    SPAWN_CONFIGS: {
        'rift': {
            size: { width: 2, height: 2 },
            spawnRate: 10000,        // Slower spawn rate (was 8000)
            minSpawnRate: 4000,      // Slower min rate (was 2000)
            spawnCap: 5,             // Reduced from 15
            maxTotalSpawns: null,    // null = infinite
            rateScale: 0.95,         // Rate multiplier per spawn
            health: null,            // null = indestructible
            enemyPool: ['void_wraith'],  // Default pool
            visual: { color: '#8800ff', animated: true }
        },
        'nest': {
            size: { width: 1, height: 1 },
            spawnRate: 12000,        // Slower (was 10000)
            minSpawnRate: 6000,      // Slower (was 4000)
            spawnCap: 3,             // Reduced from 8
            maxTotalSpawns: 8,       // Reduced from 20
            rateScale: 1.0,
            health: 100,
            enemyPool: ['spider'],
            visual: { color: '#663300', animated: false }
        },
        'portal': {
            size: { width: 2, height: 2 },
            spawnRate: 15000,        // Slower (was 12000)
            minSpawnRate: 8000,      // Slower (was 5000)
            spawnCap: 4,             // Reduced from 10
            maxTotalSpawns: null,
            rateScale: 0.9,
            health: 200,
            enemyPool: ['demon'],
            visual: { color: '#ff0044', animated: true }
        },
        'grave': {
            size: { width: 1, height: 1 },
            spawnRate: 18000,        // Slower (was 15000)
            minSpawnRate: 10000,     // Slower (was 8000)
            spawnCap: 2,             // Reduced from 4
            maxTotalSpawns: 4,       // Reduced from 8
            rateScale: 1.0,
            health: 50,
            enemyPool: ['skeleton', 'zombie'],
            visual: { color: '#444444', animated: false }
        },
        'hive': {
            size: { width: 3, height: 3 },
            spawnRate: 8000,         // Slower (was 5000)
            minSpawnRate: 3000,      // Slower (was 1500)
            spawnCap: 6,             // Reduced from 20
            maxTotalSpawns: null,
            rateScale: 0.98,
            health: 300,
            enemyPool: ['swarm'],
            visual: { color: '#aaaa00', animated: true }
        },
        'summoning_circle': {
            size: { width: 2, height: 2 },
            spawnRate: 25000,        // Slower (was 20000)
            minSpawnRate: 18000,     // Slower (was 15000)
            spawnCap: 2,             // Reduced from 3
            maxTotalSpawns: 3,       // Reduced from 5
            rateScale: 1.0,
            health: 150,
            enemyPool: ['elite'],
            visual: { color: '#ff00ff', animated: true }
        }
    },

    // ========================================================================
    // CORE METHODS
    // ========================================================================

    /**
     * Create a new spawn point
     * @param {object} config - Spawn point configuration
     * @returns {string} - The spawn point ID
     */
    create(config) {
        const type = config.type || 'rift';
        const defaults = this.SPAWN_CONFIGS[type] || this.SPAWN_CONFIGS['rift'];

        const spawnPoint = {
            id: config.id || `spawn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,

            // Position
            gridX: config.gridX ?? config.x ?? 0,
            gridY: config.gridY ?? config.y ?? 0,
            size: config.size ?? defaults.size,

            // Spawning configuration
            enemyPool: config.enemyPool ?? defaults.enemyPool,
            enemyWeights: config.enemyWeights ?? null,  // Optional weighted selection
            baseSpawnRate: config.spawnRate ?? defaults.spawnRate,
            currentSpawnRate: config.spawnRate ?? defaults.spawnRate,
            minSpawnRate: config.minSpawnRate ?? defaults.minSpawnRate,
            rateScale: config.rateScale ?? defaults.rateScale,
            spawnCap: config.spawnCap ?? defaults.spawnCap,
            maxTotalSpawns: config.maxTotalSpawns ?? defaults.maxTotalSpawns,

            // State
            active: true,
            spawnTimer: 0,
            totalSpawned: 0,

            // Health (for destructible spawn points)
            health: config.health ?? defaults.health,
            maxHealth: config.health ?? defaults.health,

            // Difficulty scaling
            difficultyScale: config.difficultyScale ?? 1.0,
            floorScale: config.floorScale ?? 0.1,  // Per floor scaling

            // Visual
            visual: config.visual ?? defaults.visual,
            visible: true,

            // Callbacks
            onSpawn: config.onSpawn ?? null,
            onDestroy: config.onDestroy ?? null,
            onEmpty: config.onEmpty ?? null  // Called when max spawns reached
        };

        this.spawnPoints.set(spawnPoint.id, spawnPoint);
        this.activeSpawns.set(spawnPoint.id, new Set());

        // Mark tiles on map
        this.markTilesOnMap(spawnPoint);

        if (this.config.debugLogging) {
            console.log(`[SpawnPoint] Created: ${spawnPoint.id} at (${spawnPoint.gridX}, ${spawnPoint.gridY})`);
        }

        return spawnPoint.id;
    },

    /**
     * Destroy a spawn point
     * @param {string} spawnPointId - The spawn point to destroy
     * @param {boolean} killSpawns - Whether to kill all spawned enemies
     */
    destroy(spawnPointId, killSpawns = false) {
        const spawnPoint = this.spawnPoints.get(spawnPointId);
        if (!spawnPoint) return;

        // Handle spawned enemies
        if (killSpawns) {
            const spawns = this.activeSpawns.get(spawnPointId);
            if (spawns) {
                spawns.forEach(enemy => {
                    if (enemy && enemy.hp > 0) {
                        enemy.hp = 0;
                        // Banish effect instead of death
                        if (spawnPoint.type === 'rift' || spawnPoint.type === 'portal') {
                            addMessage(`${enemy.name} is banished!`);
                        }
                    }
                });
            }
        }

        // Clear map tiles
        this.clearTilesOnMap(spawnPoint);

        // Call destroy callback
        if (spawnPoint.onDestroy) {
            spawnPoint.onDestroy(spawnPoint);
        }

        // Remove from tracking
        this.spawnPoints.delete(spawnPointId);
        this.activeSpawns.delete(spawnPointId);

        if (this.config.debugLogging) {
            console.log(`[SpawnPoint] Destroyed: ${spawnPointId}`);
        }
    },

    /**
     * Get a spawn point by ID
     * @param {string} spawnPointId - The spawn point ID
     * @returns {object|null}
     */
    get(spawnPointId) {
        return this.spawnPoints.get(spawnPointId) || null;
    },

    /**
     * Activate/deactivate a spawn point
     * @param {string} spawnPointId - The spawn point ID
     * @param {boolean} active - New active state
     */
    setActive(spawnPointId, active) {
        const spawnPoint = this.spawnPoints.get(spawnPointId);
        if (spawnPoint) {
            spawnPoint.active = active;
            if (!active) {
                spawnPoint.spawnTimer = 0;
            }
        }
    },

    /**
     * Damage a spawn point (for destructible ones)
     * @param {string} spawnPointId - The spawn point ID
     * @param {number} damage - Damage amount
     * @returns {boolean} - True if destroyed
     */
    damage(spawnPointId, damage) {
        const spawnPoint = this.spawnPoints.get(spawnPointId);
        if (!spawnPoint || spawnPoint.health === null) return false;

        spawnPoint.health -= damage;

        if (spawnPoint.health <= 0) {
            this.destroy(spawnPointId, true);
            return true;
        }

        return false;
    },

    // ========================================================================
    // SPAWNING LOGIC
    // ========================================================================

    /**
     * Spawn an enemy from a spawn point
     * @param {object} spawnPoint - The spawn point
     * @returns {object|null} - The spawned enemy or null
     */
    spawnEnemy(spawnPoint) {
        // Check caps
        const activeCount = this.activeSpawns.get(spawnPoint.id)?.size || 0;
        if (activeCount >= spawnPoint.spawnCap) return null;

        const globalCount = this.getGlobalActiveCount();
        if (globalCount >= this.config.globalSpawnCap) return null;

        if (spawnPoint.maxTotalSpawns !== null &&
            spawnPoint.totalSpawned >= spawnPoint.maxTotalSpawns) {
            spawnPoint.active = false;
            if (spawnPoint.onEmpty) {
                spawnPoint.onEmpty(spawnPoint);
            }
            return null;
        }

        // Find spawn position
        const spawnPos = this.findSpawnPosition(spawnPoint);
        if (!spawnPos) return null;

        // Select enemy type
        const enemyType = this.selectEnemyType(spawnPoint);
        if (!enemyType) return null;

        // Create enemy
        const enemy = this.createEnemy(enemyType, spawnPos.x, spawnPos.y, spawnPoint);
        if (!enemy) return null;

        // Track the spawn
        const spawns = this.activeSpawns.get(spawnPoint.id);
        if (spawns) {
            spawns.add(enemy);
        }

        spawnPoint.totalSpawned++;
        this.totalSpawned++;

        // Scale spawn rate
        spawnPoint.currentSpawnRate = Math.max(
            spawnPoint.minSpawnRate,
            spawnPoint.currentSpawnRate * spawnPoint.rateScale
        );

        // Callback
        if (spawnPoint.onSpawn) {
            spawnPoint.onSpawn(enemy, spawnPoint);
        }

        if (this.config.debugLogging) {
            console.log(`[SpawnPoint] ${spawnPoint.id} spawned ${enemyType} at (${spawnPos.x}, ${spawnPos.y})`);
        }

        return enemy;
    },

    /**
     * Find a valid position to spawn an enemy
     * @param {object} spawnPoint - The spawn point
     * @returns {object|null} - {x, y} or null
     */
    findSpawnPosition(spawnPoint) {
        const centerX = spawnPoint.gridX + Math.floor(spawnPoint.size.width / 2);
        const centerY = spawnPoint.gridY + Math.floor(spawnPoint.size.height / 2);

        // Try positions around the spawn point
        const offsets = [
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
            { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 },
            { x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }
        ];

        // Randomize order
        for (let i = offsets.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
        }

        for (const offset of offsets) {
            const x = centerX + offset.x * spawnPoint.size.width;
            const y = centerY + offset.y * spawnPoint.size.height;

            if (this.isValidSpawnPosition(x, y)) {
                return { x, y };
            }
        }

        return null;
    },

    /**
     * Check if a position is valid for spawning
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {boolean}
     */
    isValidSpawnPosition(x, y) {
        // Bounds check
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;

        // Tile check
        const tile = game.map[y]?.[x];
        if (!tile || tile.type === 'wall' || tile.type === 'void' || tile.blocked) return false;

        // Distance from player check
        if (game.player) {
            const dist = Math.sqrt(
                (x - game.player.gridX) ** 2 + (y - game.player.gridY) ** 2
            );
            if (dist < this.config.minSpawnDistance) return false;
        }

        // Check for other entities
        const hasEnemy = game.enemies?.some(e =>
            Math.floor(e.gridX) === x && Math.floor(e.gridY) === y
        );
        if (hasEnemy) return false;

        return true;
    },

    /**
     * Select an enemy type from the pool
     * @param {object} spawnPoint - The spawn point
     * @returns {string|null}
     */
    selectEnemyType(spawnPoint) {
        if (!spawnPoint.enemyPool || spawnPoint.enemyPool.length === 0) return null;

        if (spawnPoint.enemyWeights) {
            // Weighted random selection
            const totalWeight = spawnPoint.enemyWeights.reduce((a, b) => a + b, 0);
            let rand = Math.random() * totalWeight;

            for (let i = 0; i < spawnPoint.enemyPool.length; i++) {
                rand -= spawnPoint.enemyWeights[i];
                if (rand <= 0) {
                    return spawnPoint.enemyPool[i];
                }
            }
        }

        // Uniform random selection
        return spawnPoint.enemyPool[Math.floor(Math.random() * spawnPoint.enemyPool.length)];
    },

    /**
     * Create an enemy at a position
     * @param {string} enemyType - The enemy type ID
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @param {object} spawnPoint - The spawn point that created this enemy
     * @returns {object|null}
     */
    createEnemy(enemyType, x, y, spawnPoint) {
        // Check if MONSTER_DATA exists
        const template = typeof MONSTER_DATA !== 'undefined' ? MONSTER_DATA[enemyType] : null;

        if (!template) {
            // Create a basic enemy if template not found
            if (this.config.debugLogging) {
                console.warn(`[SpawnPoint] Unknown enemy type: ${enemyType}, using placeholder`);
            }
        }

        // Calculate difficulty scaling
        const floorBonus = 1 + (game.floor - 1) * spawnPoint.floorScale;
        const totalScale = spawnPoint.difficultyScale * floorBonus;

        const enemy = {
            id: `spawn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: template?.name || enemyType,
            typeId: enemyType,
            gridX: x,
            gridY: y,
            x: x,
            y: y,
            displayX: x,
            displayY: y,
            hp: Math.floor((template?.stats?.health || 30) * totalScale),
            maxHp: Math.floor((template?.stats?.health || 30) * totalScale),
            damage: Math.floor((template?.stats?.attack || 5) * totalScale),
            defense: Math.floor((template?.stats?.defense || 0) * totalScale),
            element: template?.element || 'physical',
            tier: template?.tier || 'common',
            ...template,
            // Track spawn point origin
            spawnPointId: spawnPoint.id,
            spawnPointType: spawnPoint.type,
            combat: {
                isInCombat: false,
                currentTarget: null,
                attackCooldown: 0,
                attackSpeed: template?.combat?.attackSpeed || 2.0,
                autoRetaliate: true,
                attackRange: template?.combat?.range || 1,
                comboCount: 1  // Enemy combo system: 1 -> 2 -> 3 (special) -> 1
            }
        };

        // Add to game
        game.enemies.push(enemy);

        // Register with AI system
        if (typeof AIManager !== 'undefined') {
            AIManager.registerEnemy(enemy);
        }

        return enemy;
    },

    /**
     * Called when an enemy from a spawn point dies
     * @param {object} enemy - The dead enemy
     */
    onSpawnedEnemyDeath(enemy) {
        if (!enemy.spawnPointId) return;

        const spawns = this.activeSpawns.get(enemy.spawnPointId);
        if (spawns) {
            spawns.delete(enemy);
        }

        if (this.config.debugLogging) {
            console.log(`[SpawnPoint] Enemy from ${enemy.spawnPointId} died. Active: ${spawns?.size || 0}`);
        }
    },

    // ========================================================================
    // MAP TILE MANAGEMENT
    // ========================================================================

    /**
     * Mark spawn point tiles on the map
     * @param {object} spawnPoint - The spawn point
     */
    markTilesOnMap(spawnPoint) {
        for (let dy = 0; dy < spawnPoint.size.height; dy++) {
            for (let dx = 0; dx < spawnPoint.size.width; dx++) {
                const x = spawnPoint.gridX + dx;
                const y = spawnPoint.gridY + dy;
                if (game.map[y]?.[x]) {
                    game.map[y][x].spawnPoint = spawnPoint.id;
                    game.map[y][x].spawnPointType = spawnPoint.type;
                }
            }
        }
    },

    /**
     * Clear spawn point tiles from the map
     * @param {object} spawnPoint - The spawn point
     */
    clearTilesOnMap(spawnPoint) {
        for (let dy = 0; dy < spawnPoint.size.height; dy++) {
            for (let dx = 0; dx < spawnPoint.size.width; dx++) {
                const x = spawnPoint.gridX + dx;
                const y = spawnPoint.gridY + dy;
                if (game.map[y]?.[x]) {
                    delete game.map[y][x].spawnPoint;
                    delete game.map[y][x].spawnPointType;
                }
            }
        }
    },

    // ========================================================================
    // UPDATE & LIFECYCLE
    // ========================================================================

    /**
     * Update all spawn points
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        this.spawnPoints.forEach((spawnPoint, id) => {
            if (!spawnPoint.active) return;

            // Update spawn timer
            spawnPoint.spawnTimer += dt;

            if (spawnPoint.spawnTimer >= spawnPoint.currentSpawnRate) {
                spawnPoint.spawnTimer = 0;
                this.spawnEnemy(spawnPoint);
            }
        });

        // Clean up dead enemies from tracking
        this.activeSpawns.forEach((spawns, spawnPointId) => {
            spawns.forEach(enemy => {
                if (!enemy || enemy.hp <= 0 || !game.enemies.includes(enemy)) {
                    spawns.delete(enemy);
                }
            });
        });
    },

    /**
     * Cleanup all spawn points
     */
    cleanup() {
        // Clear all spawn points
        this.spawnPoints.forEach((spawnPoint, id) => {
            this.clearTilesOnMap(spawnPoint);
        });

        this.spawnPoints.clear();
        this.activeSpawns.clear();
        this.totalSpawned = 0;

        if (this.config.debugLogging) {
            console.log('[SpawnPoint] System cleaned up');
        }
    },

    // ========================================================================
    // QUERY METHODS
    // ========================================================================

    /**
     * Get total active enemies from all spawn points
     * @returns {number}
     */
    getGlobalActiveCount() {
        let count = 0;
        this.activeSpawns.forEach(spawns => {
            count += spawns.size;
        });
        return count;
    },

    /**
     * Get active count for a specific spawn point
     * @param {string} spawnPointId - The spawn point ID
     * @returns {number}
     */
    getActiveCount(spawnPointId) {
        return this.activeSpawns.get(spawnPointId)?.size || 0;
    },

    /**
     * Get spawn point at a position
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {object|null}
     */
    getAtPosition(x, y) {
        for (const [id, spawnPoint] of this.spawnPoints) {
            if (x >= spawnPoint.gridX && x < spawnPoint.gridX + spawnPoint.size.width &&
                y >= spawnPoint.gridY && y < spawnPoint.gridY + spawnPoint.size.height) {
                return spawnPoint;
            }
        }
        return null;
    },

    /**
     * Get all spawn points
     * @returns {Array}
     */
    getAll() {
        return Array.from(this.spawnPoints.values());
    },

    /**
     * Get spawn points by type
     * @param {string} type - Spawn point type
     * @returns {Array}
     */
    getByType(type) {
        const result = [];
        this.spawnPoints.forEach(sp => {
            if (sp.type === type) result.push(sp);
        });
        return result;
    },

    // ========================================================================
    // DEBUG
    // ========================================================================

    getStatus() {
        const status = {
            totalSpawnPoints: this.spawnPoints.size,
            activeSpawnPoints: 0,
            totalActiveEnemies: this.getGlobalActiveCount(),
            totalSpawned: this.totalSpawned,
            byType: {}
        };

        this.spawnPoints.forEach(sp => {
            if (sp.active) status.activeSpawnPoints++;
            if (!status.byType[sp.type]) {
                status.byType[sp.type] = { count: 0, active: 0, spawned: 0 };
            }
            status.byType[sp.type].count++;
            if (sp.active) status.byType[sp.type].active++;
            status.byType[sp.type].spawned += sp.totalSpawned;
        });

        return status;
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const SpawnPointSystemDef = {
    name: 'spawn-point-system',

    init() {
        if (SpawnPointSystem.config.debugLogging) {
            console.log('[SpawnPoint] System initialized');
        }
    },

    update(dt) {
        SpawnPointSystem.update(dt);
    },

    cleanup() {
        SpawnPointSystem.cleanup();
    }
};

// Register with SystemManager (priority 38 - after environmental meters)
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('spawn-point-system', SpawnPointSystemDef, 38);
} else {
    console.warn('[SpawnPoint] SystemManager not found - running standalone');
}

// ============================================================================
// EXPORTS
// ============================================================================
window.SpawnPointSystem = SpawnPointSystem;

console.log('✅ Spawn Point System loaded');
