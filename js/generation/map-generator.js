// === js/generation/map-generator.js ===
// REFACTORED: Tree-based room generation with proper doorways
// Creates connected dungeon with wall-filled gaps

/**
 * Generate a new dungeon map with rectangular rooms
 */
function generateMap() {
    console.log('🗺️  Generating new rectangular dungeon...');
    
    // Reset game state
    game.rooms = [];
    game.doorways = [];
    game.decorations = [];
    game.enemies = [];
    
    // Initialize map with void
    initializeVoidMap();
    
    // Generate rooms using tree growth
    generateRoomTree();
    
    // Place floor tiles for all rooms
    for (const room of game.rooms) {
        placeRoomFloorTiles(room);
    }

    // Create doorways between connected rooms
    createDoorways();

    // Generate chambers within each room (cellular automata)
    for (const room of game.rooms) {
        if (typeof generateChambers === 'function') {
            generateChambers(room);
        }
    }

    // Fill remaining void with walls
    fillVoidWithWalls();

    // Decorate rooms
    for (const room of game.rooms) {
        if (typeof decorateRoom === 'function') {
            decorateRoom(room);
        }
    }
    
    // Spawn enemies
    for (const room of game.rooms) {
        if (room.type !== 'entrance' && typeof spawnEnemiesInRoom === 'function') {
            spawnEnemiesInRoom(room);
        }
    }
    
    console.log(`✅ Map generated: ${game.rooms.length} rooms, ${game.doorways.length} doorways`);
}

/**
 * Initialize map with void tiles
 */
function initializeVoidMap() {
    game.map = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        game.map[y] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            game.map[y][x] = { type: 'void' };
        }
    }
}

/**
 * Generate rooms in tree structure starting from entrance
 */
function generateRoomTree() {
    // Use ROOM_CONFIG if available, otherwise defaults
    const roomTotalSize = (typeof ROOM_CONFIG !== 'undefined') ? ROOM_CONFIG.totalSize : 38;
    const MIN_ROOMS = (typeof ROOM_CONFIG !== 'undefined') ? ROOM_CONFIG.minRooms : 5;
    const MAX_ROOMS = (typeof ROOM_CONFIG !== 'undefined') ? ROOM_CONFIG.maxRooms : 8;
    const targetRooms = MIN_ROOMS + Math.floor(Math.random() * (MAX_ROOMS - MIN_ROOMS + 1));

    // Create entrance room at center of map
    const centerX = Math.floor((GRID_WIDTH - roomTotalSize) / 2);
    const centerY = Math.floor((GRID_HEIGHT - roomTotalSize) / 2);
    
    const entranceRoom = generateRectangularRoom(centerX, centerY, 'entrance', 'obsidian_halls');
    game.rooms.push(entranceRoom);
    
    console.log(`  📍 Entrance room at (${centerX}, ${centerY})`);
    
    // Grow rooms from entrance
    const roomsToGrowFrom = [entranceRoom];
    
    while (game.rooms.length < targetRooms && roomsToGrowFrom.length > 0) {
        // Pick a random existing room to grow from
        const parentRoom = roomsToGrowFrom[Math.floor(Math.random() * roomsToGrowFrom.length)];
        
        // Try to add a room adjacent to this parent
        const newRoom = tryAddAdjacentRoom(parentRoom);
        
        if (newRoom) {
            // Success! Add to rooms list
            game.rooms.push(newRoom);
            roomsToGrowFrom.push(newRoom); // This new room can also have children
            
            // Link the rooms
            parentRoom.connectedRooms.push(newRoom);
            newRoom.connectedRooms.push(parentRoom);
            
            console.log(`  🌿 Added ${newRoom.type} room at (${newRoom.x}, ${newRoom.y}) connected to ${parentRoom.type}`);
        } else {
            // This room can't grow anymore, remove from growth list
            const index = roomsToGrowFrom.indexOf(parentRoom);
            if (index > -1) {
                roomsToGrowFrom.splice(index, 1);
            }
        }
    }
    
    console.log(`  ✅ Generated ${game.rooms.length} rooms (target: ${targetRooms})`);
}

/**
 * Get all possible adjacent room positions for a parent room
 * Returns array of {x, y} positions in the 4 cardinal directions
 */
function getAdjacentRoomPositions(parentRoom) {
    const roomSize = (typeof ROOM_CONFIG !== 'undefined') ? ROOM_CONFIG.totalSize : 38;
    const gap = 2; // Gap between rooms for corridors
    
    return [
        // North
        { 
            x: parentRoom.x, 
            y: parentRoom.y - roomSize - gap,
            sharedWall: 'north'  // ← ADD THIS
        },
        // South
        { 
            x: parentRoom.x, 
            y: parentRoom.y + roomSize + gap,
            sharedWall: 'south'  // ← ADD THIS
        },
        // East
        { 
            x: parentRoom.x + roomSize + gap, 
            y: parentRoom.y,
            sharedWall: 'east'  // ← ADD THIS
        },
        // West
        { 
            x: parentRoom.x - roomSize - gap, 
            y: parentRoom.y,
            sharedWall: 'west'  // ← ADD THIS
        }
    ];
}

/**
 * Check if a room at given position would overlap with existing rooms
 * @param {number} x - Proposed room x position
 * @param {number} y - Proposed room y position
 * @param {Array} rooms - Array of existing rooms
 * @returns {boolean} True if overlap detected
 */
function wouldRoomOverlap(x, y, rooms) {
    const roomSize = (typeof ROOM_CONFIG !== 'undefined') ? ROOM_CONFIG.totalSize : 38;
    const margin = 0;    // No margin needed (gap is handled in positioning)
    
    for (const room of rooms) {
        // Check if rectangles overlap (with margin)
        const overlap = !(
            x + roomSize + margin < room.x ||
            x > room.x + roomSize + margin ||
            y + roomSize + margin < room.y ||
            y > room.y + roomSize + margin
        );
        
        if (overlap) {
            return true;
        }
    }
    
    return false;
}

/**
 * Try to add a room adjacent to parent room
 * Returns new room object or null if no valid position found
 */
function tryAddAdjacentRoom(parentRoom) {
    const roomSize = (typeof ROOM_CONFIG !== 'undefined') ? ROOM_CONFIG.totalSize : 38;

    // Get all possible adjacent positions
    const positions = getAdjacentRoomPositions(parentRoom);

    // Shuffle positions for randomness
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Try each position
    for (const pos of positions) {
        // Check if position is within map bounds
        if (pos.x < 0 || pos.y < 0 ||
            pos.x + roomSize > GRID_WIDTH || pos.y + roomSize > GRID_HEIGHT) {
            continue;
        }
        
        // Check if position overlaps with existing rooms
        if (wouldRoomOverlap(pos.x, pos.y, game.rooms)) {
            continue;
        }
        
        // Valid position! Create room
        const roomType = Math.random() < 0.3 ? 'treasure' : 'combat';
        const newRoom = generateRectangularRoom(pos.x, pos.y, roomType);
        
        // Store doorway info for later
        newRoom.doorwayToParent = {
            parentRoom: parentRoom,
            side: pos.sharedWall  // Which side of the new room touches parent
        };
        
        return newRoom;
    }
    
    return null; // No valid position found
}

/**
 * Create doorways between all connected rooms
 */
function createDoorways() {
    for (const room of game.rooms) {
        if (!room.doorwayToParent) continue; // Entrance room has no parent
        
        const parent = room.doorwayToParent.parentRoom;
        const side = room.doorwayToParent.side;
        
        // Determine doorway position and orientation
        const doorway = createDoorwayBetweenRooms(room, parent, side);
        
        if (doorway) {
            game.doorways.push(doorway);
            room.doorways.push(doorway);
            parent.doorways.push(doorway);
            
            // Place doorway tiles on map
            placeDoorwayTiles(doorway);
        }
    }
}

/**
 * Create a doorway between two rooms on a specific side
 */
function createDoorwayBetweenRooms(room, parentRoom, side) {
    const doorwayWidth = Math.random() < 0.5 ? 2 : 3; // 2 or 3 tiles wide
    
    let doorwayX, doorwayY, orientation;
    
    switch(side) {
        case 'north': // Room's north wall touches parent's south wall
            // Doorway is on room's north edge
            orientation = 'horizontal';
            doorwayY = room.y; // The wall row
            // Random position along the wall (with buffer from edges)
            const northMinX = room.floorX + 2;
            const northMaxX = room.floorX + room.floorWidth - doorwayWidth - 2;
            doorwayX = northMinX + Math.floor(Math.random() * (northMaxX - northMinX + 1));
            break;
            
        case 'south': // Room's south wall touches parent's north wall
            orientation = 'horizontal';
            doorwayY = room.y + room.height - 1; // The wall row
            const southMinX = room.floorX + 2;
            const southMaxX = room.floorX + room.floorWidth - doorwayWidth - 2;
            doorwayX = southMinX + Math.floor(Math.random() * (southMaxX - southMinX + 1));
            break;
            
        case 'west': // Room's west wall touches parent's east wall
            orientation = 'vertical';
            doorwayX = room.x; // The wall column
            const westMinY = room.floorY + 2;
            const westMaxY = room.floorY + room.floorHeight - doorwayWidth - 2;
            doorwayY = westMinY + Math.floor(Math.random() * (westMaxY - westMinY + 1));
            break;
            
        case 'east': // Room's east wall touches parent's west wall
            orientation = 'vertical';
            doorwayX = room.x + room.width - 1; // The wall column
            const eastMinY = room.floorY + 2;
            const eastMaxY = room.floorY + room.floorHeight - doorwayWidth - 2;
            doorwayY = eastMinY + Math.floor(Math.random() * (eastMaxY - eastMinY + 1));
            break;
    }
    
    return {
        x: doorwayX,
        y: doorwayY,
        width: orientation === 'horizontal' ? doorwayWidth : 1,
        height: orientation === 'vertical' ? doorwayWidth : 1,
        orientation: orientation,
        room1: room,
        room2: parentRoom
    };
}

/**
 * Create a doorway between two rooms on a specific side
 */
function createDoorwayBetweenRooms(room, parentRoom, side) {
    const doorwayWidth = Math.random() < 0.5 ? 2 : 3; // 2 or 3 tiles wide
    
    let doorwayX, doorwayY, orientation;
    
    switch(side) {
        case 'north': // Room's north wall connects to parent's south wall
            orientation = 'horizontal';
            doorwayY = room.y; // Room's north wall
            const northMinX = room.floorX + 2;
            const northMaxX = room.floorX + room.floorWidth - doorwayWidth - 2;
            doorwayX = northMinX + Math.floor(Math.random() * (northMaxX - northMinX + 1));
            break;
            
        case 'south': // Room's south wall connects to parent's north wall
            orientation = 'horizontal';
            doorwayY = room.y + room.height - 1; // Room's south wall
            const southMinX = room.floorX + 2;
            const southMaxX = room.floorX + room.floorWidth - doorwayWidth - 2;
            doorwayX = southMinX + Math.floor(Math.random() * (southMaxX - southMinX + 1));
            break;
            
        case 'west': // Room's west wall connects to parent's east wall
            orientation = 'vertical';
            doorwayX = room.x; // Room's west wall
            const westMinY = room.floorY + 2;
            const westMaxY = room.floorY + room.floorHeight - doorwayWidth - 2;
            doorwayY = westMinY + Math.floor(Math.random() * (westMaxY - westMinY + 1));
            break;
            
        case 'east': // Room's east wall connects to parent's west wall
            orientation = 'vertical';
            doorwayX = room.x + room.width - 1; // Room's east wall
            const eastMinY = room.floorY + 2;
            const eastMaxY = room.floorY + room.floorHeight - doorwayWidth - 2;
            doorwayY = eastMinY + Math.floor(Math.random() * (eastMaxY - eastMinY + 1));
            break;
    }
    
    return {
        x: doorwayX,
        y: doorwayY,
        width: orientation === 'horizontal' ? doorwayWidth : 1,
        height: orientation === 'vertical' ? doorwayWidth : 1,
        orientation: orientation,
        side: side,  // ← ADD THIS - track which side this doorway is on
        room1: room,
        room2: parentRoom
    };
}

/**
 * Place doorway tiles on the map (makes them walkable)
 * Punches through BOTH room walls and creates corridor between them
 */
function placeDoorwayTiles(doorway) {
    const room = doorway.room1;
    const parent = doorway.room2;
    const side = doorway.side;

    // Place walkable floor tiles for the full corridor
    if (doorway.orientation === 'horizontal') {
        // North-South connection
        let startY, endY;

        if (side === 'north') {
            // Room's north wall to parent's south wall
            startY = Math.min(room.y, parent.y + parent.height);
            endY = Math.max(room.y, parent.y + parent.height);
        } else {
            // Room's south wall to parent's north wall
            startY = Math.min(parent.y, room.y + room.height);
            endY = Math.max(parent.y, room.y + room.height);
        }

        // Create corridor tiles for full length
        for (let y = startY; y < endY; y++) {
            for (let dx = 0; dx < doorway.width; dx++) {
                const x = doorway.x + dx;
                if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
                    game.map[y][x] = {
                        type: 'floor',
                        corridor: true,
                        doorway: doorway
                    };
                }
            }
        }
    } else {
        // East-West connection
        let startX, endX;

        if (side === 'west') {
            // Room's west wall to parent's east wall
            startX = Math.min(room.x, parent.x + parent.width);
            endX = Math.max(room.x, parent.x + parent.width);
        } else {
            // Room's east wall to parent's west wall
            startX = Math.min(parent.x, room.x + room.width);
            endX = Math.max(parent.x, room.x + room.width);
        }

        // Create corridor tiles for full length
        for (let x = startX; x < endX; x++) {
            for (let dy = 0; dy < doorway.height; dy++) {
                const y = doorway.y + dy;
                if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
                    game.map[y][x] = {
                        type: 'floor',
                        corridor: true,
                        doorway: doorway
                    };
                }
            }
        }
    }
}

/**
 * Create corridor tiles to connect rooms through their doorway
 */
function createCorridorBetweenRooms(doorway) {
    const room1 = doorway.room1;
    const room2 = doorway.room2;
    
    if (doorway.orientation === 'horizontal') {
        // Horizontal corridor (north-south connection)
        // Find the gap between rooms
        const minY = Math.min(room1.y + room1.height, room2.y + room2.height);
        const maxY = Math.max(room1.y, room2.y);
        
        // Fill corridor tiles
        for (let y = minY; y < maxY; y++) {
            for (let dx = 0; dx < doorway.width; dx++) {
                const x = doorway.x + dx;
                if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
                    game.map[y][x] = {
                        type: 'floor',
                        corridor: true
                    };
                }
            }
        }
    } else {
        // Vertical corridor (east-west connection)
        // Find the gap between rooms
        const minX = Math.min(room1.x + room1.width, room2.x + room2.width);
        const maxX = Math.max(room1.x, room2.x);
        
        // Fill corridor tiles
        for (let x = minX; x < maxX; x++) {
            for (let dy = 0; dy < doorway.height; dy++) {
                const y = doorway.y + dy;
                if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
                    game.map[y][x] = {
                        type: 'floor',
                        corridor: true
                    };
                }
            }
        }
    }
}

/**
 * Fill all remaining void tiles with wall tiles
 * This creates the continuous dungeon structure
 */
function fillVoidWithWalls() {
    let wallTilesPlaced = 0;
    
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const tile = game.map[y][x];
            
            // If it's still void, make it a wall
            if (tile.type === 'void') {
                game.map[y][x] = {
                    type: 'wall',
                    wallType: 'fill' // Mark as gap-fill wall
                };
                wallTilesPlaced++;
            }
        }
    }
    
    console.log(`  🧱 Filled ${wallTilesPlaced} void tiles with walls`);
console.log('🔍 DEBUG INFO:');
console.log('  Total rooms:', game.rooms.length);
console.log('  Total doorways:', game.doorways.length);
game.rooms.forEach((room, i) => {
    console.log(`  Room ${i}: ${room.type} at (${room.x},${room.y}), connectedRooms: ${room.connectedRooms.length}, doorways: ${room.doorways.length}`);
});
game.doorways.forEach((door, i) => {
    console.log(`  Doorway ${i}: ${door.orientation} at (${door.x},${door.y}), side: ${door.side}`);
});

}

// Export functions
if (typeof window !== 'undefined') {
    window.generateMap = generateMap;
}

console.log('✅ Map generator loaded (Tree-based room growth)');