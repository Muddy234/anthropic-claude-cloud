// ============================================================================
// DUNGEON INTEGRATION ADAPTER
// ============================================================================
// Converts blob-based dungeon to legacy game.map format for compatibility
// ============================================================================

/**
 * Convert blob-based dungeon to game.map format
 */
function applyDungeonToGame() {
    console.log('🔄 Converting dungeon to game format...');

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

    // Fill remaining tiles with walls
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (game.map[y][x].type === 'void') {
                game.map[y][x] = {
                    type: 'wall',
                    blocked: true
                };
            }
        }
    }

    console.log(`✅ Converted ${game.rooms.length} blobs to rooms`);
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

    console.log(`👤 Player spawned at entrance (${game.player.x}, ${game.player.y})`);
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

        // Enemy count based on blob size
        const blobSize = blob.tiles.size;
        const baseCount = Math.max(1, Math.floor(blobSize / 200)); // 1 enemy per 200 tiles
        const enemyCount = baseCount + Math.floor(Math.random() * baseCount);

        // Spawn enemies using existing spawner if available
        if (typeof spawnEnemiesInRoom === 'function') {
            // Temporarily set room type for spawner
            const originalType = room.type;
            room.type = blob.blobType === 'treasure' ? 'treasure' : 'combat';

            spawnEnemiesInRoom(room);

            room.type = originalType;
        } else {
            // Fallback: simple enemy spawning
            for (let i = 0; i < enemyCount; i++) {
                const tileKeys = Array.from(blob.tiles);
                const randomTile = tileKeys[Math.floor(Math.random() * tileKeys.length)];
                const [x, y] = randomTile.split(',').map(Number);

                if (typeof createEnemy === 'function') {
                    const enemy = createEnemy(x, y, blob.element, blob.difficulty);
                    game.enemies.push(enemy);
                }
            }
        }
    }

    console.log(`👹 Spawned ${game.enemies.length} enemies across ${DUNGEON_STATE.blobs.length} blobs`);
}

/**
 * Decorate blobs with environmental details
 */
function decorateDungeon() {
    for (const blob of DUNGEON_STATE.blobs) {
        const room = game.rooms.find(r => r.blob === blob);
        if (!room) continue;

        // Use existing decorator if available
        if (typeof decorateRoom === 'function') {
            decorateRoom(room);
        }
    }

    console.log(`🎨 Decorated ${game.rooms.length} blobs`);
}

/**
 * Main integration function - replaces generateMap()
 */
function generateBlobDungeon() {
    console.log('🗺️  Generating blob-based dungeon...');

    // Reset game state
    game.rooms = [];
    game.doorways = [];
    game.decorations = [];
    game.enemies = [];

    // Generate the dungeon blob map
    generateBlobDungeonMap();

    // Convert to game format
    applyDungeonToGame();

    // Decorate
    decorateDungeon();

    // Spawn enemies
    spawnEnemiesInDungeon();

    // Note: Player spawning is handled by game-init.js::initializePlayer()

    console.log(`✅ Blob dungeon generated: ${game.rooms.length} blobs, ${game.enemies.length} enemies`);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.generateBlobDungeon = generateBlobDungeon;
    window.applyDungeonToGame = applyDungeonToGame;
    window.spawnPlayerInDungeon = spawnPlayerInDungeon;
    window.spawnEnemiesInDungeon = spawnEnemiesInDungeon;
}

console.log('✅ Dungeon integration adapter loaded');
