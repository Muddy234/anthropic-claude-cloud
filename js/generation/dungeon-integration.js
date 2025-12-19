// ============================================================================
// DUNGEON INTEGRATION ADAPTER
// ============================================================================
// Converts blob-based dungeon to legacy game.map format for compatibility
// ============================================================================

/**
 * Create an enemy at the specified position (for blob dungeon spawning)
 * Different from enemy-spawner.js createEnemy which takes monsterType explicitly
 * @param {number} x - Grid X position
 * @param {number} y - Grid Y position
 * @param {string} element - Element type for selecting appropriate monsters
 * @param {number} difficulty - Difficulty scaling factor
 * @returns {object} The created enemy
 */
function createEnemyAtPosition(x, y, element, difficulty) {
    // Get element-appropriate monsters from MONSTER_DATA
    const elementMonsters = [];
    const fallbackMonsters = [];

    if (typeof MONSTER_DATA !== 'undefined') {
        for (const [name, data] of Object.entries(MONSTER_DATA)) {
            if (data.elite) continue; // Skip elites for regular spawning

            if (data.element === element) {
                elementMonsters.push({ name, data });
            } else {
                fallbackMonsters.push({ name, data });
            }
        }
    }

    // Pick a monster - prefer element-matching, fallback to any
    const pool = elementMonsters.length > 0 ? elementMonsters : fallbackMonsters;

    if (pool.length === 0) {
        console.warn('[createEnemy] No monsters available in MONSTER_DATA');
        return null;
    }

    // Weight-based selection
    const totalWeight = pool.reduce((sum, m) => sum + (m.data.spawnWeight || 10), 0);
    let roll = Math.random() * totalWeight;
    let selected = pool[0];

    for (const monster of pool) {
        roll -= monster.data.spawnWeight || 10;
        if (roll <= 0) {
            selected = monster;
            break;
        }
    }

    const template = selected.data;
    const difficultyScale = 1 + (difficulty - 1) * 0.15;

    const enemy = {
        id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: selected.name,
        typeId: selected.name,
        gridX: x,
        gridY: y,
        x: x,
        y: y,
        displayX: x,
        displayY: y,
        hp: Math.floor((template.hp || 50) * difficultyScale),
        maxHp: Math.floor((template.hp || 50) * difficultyScale),
        str: Math.floor((template.str || 10) * difficultyScale),
        agi: template.agi || 5,
        int: template.int || 5,
        pDef: Math.floor((template.pDef || 5) * difficultyScale),
        mDef: Math.floor((template.mDef || 5) * difficultyScale),
        damage: Math.floor((template.str || 10) * difficultyScale),
        defense: Math.floor((template.pDef || 5) * difficultyScale),
        element: template.element || 'physical',
        xp: Math.floor((template.xp || 20) * difficultyScale),
        attackRange: template.attackRange || 1,
        attackSpeed: template.attackSpeed || 2.0,
        moveInterval: template.moveInterval || 2,
        aggression: template.aggression || 3,
        loot: template.loot || [],
        combat: {
            isInCombat: false,
            currentTarget: null,
            attackCooldown: 0,
            attackSpeed: template.attackSpeed || 2.0,
            autoRetaliate: true,
            attackRange: template.attackRange || 1,
            comboCount: 1
        }
    };

    // Register with AI system
    if (typeof AIManager !== 'undefined') {
        AIManager.registerEnemy(enemy);
    }

    // Initialize abilities
    if (typeof EnemyAbilitySystem !== 'undefined') {
        EnemyAbilitySystem.initializeEnemy(enemy);
    }

    return enemy;
}

/**
 * Convert blob-based dungeon to game.map format
 */
function applyDungeonToGame() {
    // Initialize game map with void
    game.map = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        game.map[y] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            game.map[y][x] = { type: 'void' };
        }
    }

    // Create "rooms" from blobs for compatibility
    game.rooms = [];
    game.doorways = [];
    game.decorations = [];

    let roomId = 0;
    for (const blob of DUNGEON_STATE.blobs) {
        // Create room object from blob
        const room = createRoomFromBlob(blob, roomId++);
        game.rooms.push(room);

        // Paint blob tiles as floors
        for (const tileKey of blob.tiles) {
            const [x, y] = tileKey.split(',').map(Number);

            if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) continue;

            game.map[y][x] = {
                type: 'floor',
                room: room,
                element: blob.element,
                floorColor: getColorForTheme(blob.theme, 'floor'),
                accentColor: getColorForTheme(blob.theme, 'accent')
            };
        }
    }

    // Paint corridor tiles
    for (const corridor of DUNGEON_STATE.corridors) {
        for (const tileKey of corridor.tiles) {
            const [x, y] = tileKey.split(',').map(Number);

            if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) continue;

            // Determine theme based on position along corridor
            const theme = getCorridorThemeAtTile(corridor, x, y);

            game.map[y][x] = {
                type: 'floor',
                corridor: true,
                element: corridor.startBlob.element, // Could blend elements
                floorColor: getColorForTheme(theme, 'floor'),
                accentColor: getColorForTheme(theme, 'accent')
            };
        }
    }

    // Keep void tiles as void (inaccessible black areas)
    // Don't convert to walls - void areas should remain black/inaccessible
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (game.map[y][x].type === 'void') {
                game.map[y][x] = {
                    type: 'void',
                    blocked: true
                };
            }
        }
    }

}

/**
 * Create a room object from a blob for compatibility
 */
function createRoomFromBlob(blob, id) {
    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const tileKey of blob.tiles) {
        const [x, y] = tileKey.split(',').map(Number);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // Get theme colors
    const themeData = typeof ROOM_THEMES !== 'undefined' ? ROOM_THEMES[blob.theme] : null;

    return {
        id: id,
        x: minX,
        y: minY,
        width: width,
        height: height,
        floorX: minX,
        floorY: minY,
        floorWidth: width,
        floorHeight: height,

        type: blob.blobType,
        theme: blob.theme,
        shape: 'blob',

        element: blob.element,
        elementPower: blob.difficulty,

        doorways: [], // Corridors serve as doorways
        connectedRooms: [],

        // Store blob reference
        blob: blob,

        // Theme colors
        floorColor: themeData ? themeData.floorColor : '#2a2a2a',
        accentColor: themeData ? themeData.accentColor : '#4a4a4a',
        wallColor: themeData ? themeData.wallColor : '#1a1a1a',

        generated: true
    };
}

/**
 * Get theme at a specific corridor tile
 */
function getCorridorThemeAtTile(corridor, x, y) {
    const pathIndex = corridor.path.findIndex(p => p.x === x && p.y === y);

    if (pathIndex >= 0) {
        const midIndex = Math.floor(corridor.path.length / 2);
        return pathIndex < midIndex ? corridor.startBlob.theme : corridor.endBlob.theme;
    }

    // Fallback to start theme
    return corridor.startBlob.theme;
}

/**
 * Get color for theme
 */
function getColorForTheme(theme, type) {
    if (typeof ROOM_THEMES === 'undefined') {
        return type === 'floor' ? '#2a2a2a' : '#4a4a4a';
    }

    const themeData = ROOM_THEMES[theme];
    if (!themeData) {
        return type === 'floor' ? '#2a2a2a' : '#4a4a4a';
    }

    switch (type) {
        case 'floor': return themeData.floorColor || '#2a2a2a';
        case 'accent': return themeData.accentColor || '#4a4a4a';
        case 'wall': return themeData.wallColor || '#1a1a1a';
        default: return '#2a2a2a';
    }
}

/**
 * Spawn player in entrance blob
 */
function spawnPlayerInDungeon() {
    const entrance = DUNGEON_STATE.entranceBlob;
    if (!entrance) {
        console.error('No entrance blob found!');
        return;
    }

    // Spawn at connection point (guaranteed floor)
    game.player.x = entrance.connectionPoint.x;
    game.player.y = entrance.connectionPoint.y;
}

/**
 * Spawn enemies in blobs based on type and difficulty
 */
function spawnEnemiesInDungeon() {
    for (const blob of DUNGEON_STATE.blobs) {
        if (blob.blobType === 'entrance') continue; // No enemies in entrance
        if (blob.blobType === 'treasure' && Math.random() < 0.5) continue; // 50% chance to skip treasure

        const room = game.rooms.find(r => r.blob === blob);
        if (!room) continue;

        // Enemy count based on blob size - tripled for more action
        const blobSize = blob.tiles.size;
        const baseCount = Math.max(3, Math.floor(blobSize / 70)); // 1 enemy per 70 tiles (was 200)
        const enemyCount = baseCount + Math.floor(Math.random() * baseCount);

        // Spawn enemies using existing spawner if available
        if (typeof spawnEnemiesInRoom === 'function') {
            // Temporarily set room type for spawner
            const originalType = room.type;
            room.type = blob.blobType === 'treasure' ? 'treasure' : 'combat';

            // Pass the calculated enemy count to override spawner's calculation
            spawnEnemiesInRoom(room, null, enemyCount);

            room.type = originalType;
        } else {
            // Fallback: simple enemy spawning
            for (let i = 0; i < enemyCount; i++) {
                const tileKeys = Array.from(blob.tiles);
                const randomTile = tileKeys[Math.floor(Math.random() * tileKeys.length)];
                const [x, y] = randomTile.split(',').map(Number);

                const enemy = createEnemyAtPosition(x, y, blob.element, blob.difficulty);
                if (enemy) {
                    game.enemies.push(enemy);
                }
            }
        }
    }
}

/**
 * Spawn shrine decorations in shrine rooms
 * Places an interactable shrine object in each shrine-type room
 */
function spawnShrineDecorations() {
    if (!DUNGEON_STATE.blobs) return;

    let shrineCount = 0;

    for (const blob of DUNGEON_STATE.blobs) {
        if (blob.blobType !== 'shrine') continue;

        const room = game.rooms.find(r => r.blob === blob);
        if (!room) continue;

        // Find center position for shrine
        const shrinePos = findShrinePosition(blob, room);
        if (!shrinePos) {
            console.warn('[DungeonIntegration] Could not find position for shrine');
            continue;
        }

        // Create shrine decoration
        const shrine = {
            x: shrinePos.x,
            y: shrinePos.y,
            type: 'shrine',
            room: room,
            element: 'holy',
            blocking: false,
            interactable: true,
            used: false,
            sprite: null,
            color: '#FFD700',
            name: 'Ancient Shrine',
            description: 'A shrine pulsing with divine energy. It may grant a blessing.',
            data: {
                color: '#FFD700',
                symbol: String.fromCodePoint(0x26E9), // Shinto shrine symbol
                glow: true,
                glowColor: '#FFD700',
                glowRadius: 1.5,
                size: 'large'
            }
        };

        // Add to game decorations
        if (!game.decorations) game.decorations = [];
        game.decorations.push(shrine);

        // Add to room decorations
        if (!room.decorations) room.decorations = [];
        room.decorations.push(shrine);

        // Mark tile as having a decoration
        const tile = game.map?.[shrinePos.y]?.[shrinePos.x];
        if (tile) {
            tile.decoration = shrine;
        }

        shrineCount++;
    }

    console.log(`[DungeonIntegration] Spawned ${shrineCount} shrine decorations`);
}

/**
 * Find a suitable position for a shrine within a blob
 * Prefers center of room, away from walls
 */
function findShrinePosition(blob, room) {
    // Try connection point first (center-ish)
    const centerX = blob.connectionPoint.x;
    const centerY = blob.connectionPoint.y;

    // Verify it's a valid floor tile
    if (isValidShrinePosition(centerX, centerY)) {
        return { x: centerX, y: centerY };
    }

    // Try offsets from center
    const offsets = [
        { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
        { dx: 1, dy: 1 }, { dx: -1, dy: -1 },
        { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
    ];

    for (const offset of offsets) {
        const x = centerX + offset.dx;
        const y = centerY + offset.dy;
        if (isValidShrinePosition(x, y)) {
            return { x, y };
        }
    }

    // Fallback: search the blob tiles for a valid position
    const tiles = Array.from(blob.tiles);
    for (const tileKey of tiles) {
        const [x, y] = tileKey.split(',').map(Number);
        if (isValidShrinePosition(x, y)) {
            return { x, y };
        }
    }

    return null;
}

/**
 * Check if a position is valid for shrine placement
 */
function isValidShrinePosition(x, y) {
    if (!game.map || !game.map[y] || !game.map[y][x]) {
        return false;
    }

    const tile = game.map[y][x];

    // Must be floor
    if (tile.type !== 'floor') return false;

    // Must not be blocked
    if (tile.blocked) return false;

    // Must not have existing decoration
    if (tile.decoration) return false;

    // Must not have enemy
    if (game.enemies && game.enemies.some(e =>
        Math.floor(e.gridX) === x && Math.floor(e.gridY) === y
    )) {
        return false;
    }

    return true;
}

/**
 * Main integration function - replaces generateMap()
 */
function generateBlobDungeon() {
    // Reset game state
    game.rooms = [];
    game.doorways = [];
    game.decorations = [];
    game.enemies = [];

    // Generate the dungeon blob map
    generateBlobDungeonMap();

    // Convert to game format
    applyDungeonToGame();

    // Spawn enemies
    spawnEnemiesInDungeon();

    // Spawn shrine decorations in shrine rooms
    spawnShrineDecorations();

    // Note: Player spawning is handled by game-init.js::initializePlayer()

    // Place exit in farthest room from entrance
    placeExitInFarthestRoom();
}

/**
 * Place the exit/safe room in the farthest accessible room from the entrance
 */
function placeExitInFarthestRoom() {
    if (!DUNGEON_STATE.blobs || DUNGEON_STATE.blobs.length === 0) {
        console.warn('No blobs available for exit placement');
        return;
    }

    const entranceBlob = DUNGEON_STATE.entranceBlob;
    if (!entranceBlob) {
        console.warn('No entrance blob found for exit placement');
        return;
    }

    // Find the farthest blob from entrance (highest difficulty, excluding entrance)
    let farthestBlob = null;
    let maxDifficulty = 0;

    for (const blob of DUNGEON_STATE.blobs) {
        if (blob === entranceBlob) continue;
        if (blob.difficulty > maxDifficulty) {
            maxDifficulty = blob.difficulty;
            farthestBlob = blob;
        }
    }

    // Fallback: if no blob found, use the last blob in the array (sorted by distance)
    if (!farthestBlob) {
        farthestBlob = DUNGEON_STATE.blobs[DUNGEON_STATE.blobs.length - 1];
        if (farthestBlob === entranceBlob && DUNGEON_STATE.blobs.length > 1) {
            farthestBlob = DUNGEON_STATE.blobs[DUNGEON_STATE.blobs.length - 2];
        }
    }

    if (!farthestBlob) {
        console.warn('Could not find suitable blob for exit placement');
        return;
    }

    // Get exit position - use connection point (guaranteed floor tile)
    let exitX = farthestBlob.connectionPoint.x;
    let exitY = farthestBlob.connectionPoint.y;

    // Verify the exit position is reachable from entrance using pathfinding
    if (typeof findPath === 'function') {
        const entranceX = entranceBlob.connectionPoint.x;
        const entranceY = entranceBlob.connectionPoint.y;

        const path = findPath(entranceX, entranceY, exitX, exitY, { ignoreEnemies: true });

        if (!path || path.length === 0) {
            // Try to find an alternate floor tile in the farthest blob
            const tiles = Array.from(farthestBlob.tiles);
            for (const tileKey of tiles) {
                const [tx, ty] = tileKey.split(',').map(Number);
                const alternatePath = findPath(entranceX, entranceY, tx, ty, { ignoreEnemies: true });
                if (alternatePath && alternatePath.length > 0) {
                    exitX = tx;
                    exitY = ty;
                    break;
                }
            }
        }
    }

    // SURVIVAL EXTRACTION UPDATE: Old exit system disabled
    // Extraction points are now used instead (see ExtractionSystem)
    // Keeping exitPosition for potential legacy compatibility
    game.exitPosition = { x: exitX, y: exitY };

    // Sync with sessionState.pathDown for the new system
    if (typeof sessionState !== 'undefined' && sessionState.pathDown) {
        sessionState.pathDown.x = exitX;
        sessionState.pathDown.y = exitY;
        // Don't auto-discover - player needs to find it or defeat mini-boss
    }

    // Also sync via SessionManager if available
    if (typeof SessionManager !== 'undefined' && typeof SessionManager.discoverPathDown === 'function') {
        // Set the position but don't mark as discovered yet
        if (sessionState && sessionState.pathDown) {
            sessionState.pathDown.x = exitX;
            sessionState.pathDown.y = exitY;
        }
    }

    // Create descent/exit tile on the map
    if (game.map[exitY] && game.map[exitY][exitX]) {
        game.map[exitY][exitX] = {
            type: 'exit',
            explored: false,
            visible: false,
            lit: false,
            room: game.rooms.find(r => r.blob === farthestBlob) || null
        };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.generateBlobDungeon = generateBlobDungeon;
    window.applyDungeonToGame = applyDungeonToGame;
    window.spawnPlayerInDungeon = spawnPlayerInDungeon;
    window.spawnEnemiesInDungeon = spawnEnemiesInDungeon;
    window.placeExitInFarthestRoom = placeExitInFarthestRoom;
    window.createEnemyAtPosition = createEnemyAtPosition;
}

// Dungeon integration adapter loaded
