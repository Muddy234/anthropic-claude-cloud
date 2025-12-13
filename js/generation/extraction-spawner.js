// === js/generation/extraction-spawner.js ===
// SURVIVAL EXTRACTION UPDATE: Extraction point placement

// ============================================================================
// EXTRACTION SPAWNER
// ============================================================================

const ExtractionSpawner = {

    /**
     * Spawn extraction points for a floor
     * @param {number} floor - Current floor number
     * @param {Array} rooms - Array of room objects
     * @param {Object} spawnRoom - The player spawn room (to avoid)
     * @returns {Array} Array of extraction point entities
     */
    spawnExtractionPoints(floor, rooms, spawnRoom) {
        const config = EXTRACTION_CONFIG || {
            shaftsPerFloor: { 1: 3, 2: 3, 3: 3, 4: 4, 5: 4, 6: 4 }
        };

        const count = config.shaftsPerFloor[floor] || 3;
        const points = [];

        // Get eligible rooms (not spawn, not boss, not too small)
        const eligibleRooms = rooms.filter(room => {
            // Skip spawn room
            if (spawnRoom && room.id === spawnRoom.id) return false;

            // Skip boss/miniboss rooms
            if (room.type === 'boss' || room.type === 'miniboss') return false;

            // Skip very small rooms
            const minSize = 5;
            if (room.floorWidth < minSize || room.floorHeight < minSize) return false;

            return true;
        });

        if (eligibleRooms.length === 0) {
            console.warn('[ExtractionSpawner] No eligible rooms for extraction points!');
            return points;
        }

        // Select distributed rooms
        const selectedRooms = this._selectDistributedRooms(
            eligibleRooms,
            count,
            spawnRoom
        );

        // Create extraction points
        selectedRooms.forEach((room, index) => {
            const pos = this._findValidPosition(room);
            if (pos) {
                const point = createExtractionPoint(
                    pos.x,
                    pos.y,
                    `shaft_f${floor}_${index}`
                );
                points.push(point);
                console.log(`[ExtractionSpawner] Placed shaft at (${pos.x}, ${pos.y}) in room ${room.id}`);
            }
        });

        console.log(`[ExtractionSpawner] Spawned ${points.length} extraction points on floor ${floor}`);
        return points;
    },

    /**
     * Select rooms that are well-distributed across the map
     * @param {Array} rooms - Eligible rooms
     * @param {number} count - Number to select
     * @param {Object} spawnRoom - Spawn room for distance calculation
     * @returns {Array} Selected rooms
     * @private
     */
    _selectDistributedRooms(rooms, count, spawnRoom) {
        if (rooms.length <= count) {
            return rooms;
        }

        // Calculate center of map
        const mapCenterX = GRID_WIDTH ? GRID_WIDTH / 2 : 100;
        const mapCenterY = GRID_HEIGHT ? GRID_HEIGHT / 2 : 100;

        // Get spawn position for distance calculations
        const spawnX = spawnRoom ? (spawnRoom.floorX + spawnRoom.floorWidth / 2) : mapCenterX;
        const spawnY = spawnRoom ? (spawnRoom.floorY + spawnRoom.floorHeight / 2) : mapCenterY;

        // Score rooms by distance from spawn (prefer farther rooms)
        const scoredRooms = rooms.map(room => {
            const roomCenterX = room.floorX + room.floorWidth / 2;
            const roomCenterY = room.floorY + room.floorHeight / 2;

            const distFromSpawn = Math.sqrt(
                Math.pow(roomCenterX - spawnX, 2) +
                Math.pow(roomCenterY - spawnY, 2)
            );

            return {
                room,
                score: distFromSpawn,
                x: roomCenterX,
                y: roomCenterY
            };
        });

        // Sort by distance from spawn (farthest first for variety)
        scoredRooms.sort((a, b) => b.score - a.score);

        // Select rooms ensuring good distribution
        const selected = [];
        const minDistBetween = 15; // Minimum tiles between extraction points

        for (const candidate of scoredRooms) {
            if (selected.length >= count) break;

            // Check distance from already selected points
            const tooClose = selected.some(s => {
                const dist = Math.sqrt(
                    Math.pow(candidate.x - s.x, 2) +
                    Math.pow(candidate.y - s.y, 2)
                );
                return dist < minDistBetween;
            });

            if (!tooClose) {
                selected.push({
                    room: candidate.room,
                    x: candidate.x,
                    y: candidate.y
                });
            }
        }

        // If we couldn't get enough with spacing, just take top scored
        if (selected.length < count) {
            for (const candidate of scoredRooms) {
                if (selected.length >= count) break;
                if (!selected.some(s => s.room.id === candidate.room.id)) {
                    selected.push({
                        room: candidate.room,
                        x: candidate.x,
                        y: candidate.y
                    });
                }
            }
        }

        return selected.map(s => s.room);
    },

    /**
     * Find a valid position within a room for an extraction point
     * @param {Object} room - Room object
     * @returns {Object|null} { x, y } or null if no valid position
     * @private
     */
    _findValidPosition(room) {
        // Try center of room first
        const centerX = room.floorX + Math.floor(room.floorWidth / 2);
        const centerY = room.floorY + Math.floor(room.floorHeight / 2);

        if (this._isValidTile(centerX, centerY)) {
            return { x: centerX, y: centerY };
        }

        // Try offsets from center
        const offsets = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
            { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
            { dx: 0, dy: -2 }, { dx: 0, dy: 2 },
            { dx: -2, dy: 0 }, { dx: 2, dy: 0 }
        ];

        for (const offset of offsets) {
            const x = centerX + offset.dx;
            const y = centerY + offset.dy;
            if (this._isValidTile(x, y)) {
                return { x, y };
            }
        }

        // Random search within room
        for (let attempt = 0; attempt < 20; attempt++) {
            const x = room.floorX + Math.floor(Math.random() * room.floorWidth);
            const y = room.floorY + Math.floor(Math.random() * room.floorHeight);
            if (this._isValidTile(x, y)) {
                return { x, y };
            }
        }

        // Fallback to room center regardless
        return { x: centerX, y: centerY };
    },

    /**
     * Check if a tile is valid for extraction point placement
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     * @private
     */
    _isValidTile(x, y) {
        // Check bounds
        if (!game.map || !game.map[y] || !game.map[y][x]) {
            return false;
        }

        const tile = game.map[y][x];

        // Must be walkable floor
        if (tile.type !== 'floor' || !tile.walkable) {
            return false;
        }

        // Not on hazards
        if (tile.hazard || tile.isLava) {
            return false;
        }

        // Not on existing decorations/objects
        if (tile.decoration || tile.object) {
            return false;
        }

        return true;
    },

    /**
     * Spawn path down (hidden stairs to next floor)
     * @param {Array} rooms - All rooms
     * @param {Object} spawnRoom - Player spawn room
     * @returns {Object|null} Path down location { x, y, roomId }
     */
    spawnPathDown(rooms, spawnRoom) {
        const config = PATH_DOWN_CONFIG || { minDistanceFromSpawn: 10 };

        // Get spawn position
        const spawnX = spawnRoom ? (spawnRoom.floorX + spawnRoom.floorWidth / 2) : 0;
        const spawnY = spawnRoom ? (spawnRoom.floorY + spawnRoom.floorHeight / 2) : 0;

        // Find "deep" rooms (far from spawn)
        const deepRooms = rooms
            .filter(room => {
                if (room.type === 'spawn') return false;

                const roomCenterX = room.floorX + room.floorWidth / 2;
                const roomCenterY = room.floorY + room.floorHeight / 2;

                const dist = Math.sqrt(
                    Math.pow(roomCenterX - spawnX, 2) +
                    Math.pow(roomCenterY - spawnY, 2)
                );

                return dist >= config.minDistanceFromSpawn;
            })
            .sort((a, b) => {
                // Sort by distance, farthest first
                const distA = Math.sqrt(
                    Math.pow((a.floorX + a.floorWidth / 2) - spawnX, 2) +
                    Math.pow((a.floorY + a.floorHeight / 2) - spawnY, 2)
                );
                const distB = Math.sqrt(
                    Math.pow((b.floorX + b.floorWidth / 2) - spawnX, 2) +
                    Math.pow((b.floorY + b.floorHeight / 2) - spawnY, 2)
                );
                return distB - distA;
            });

        if (deepRooms.length === 0) {
            console.warn('[ExtractionSpawner] No deep rooms for path down!');
            // Fallback to any non-spawn room
            const fallbackRoom = rooms.find(r => r.type !== 'spawn');
            if (fallbackRoom) {
                deepRooms.push(fallbackRoom);
            } else {
                return null;
            }
        }

        // Pick from top 3 deepest (some randomness)
        const candidates = deepRooms.slice(0, 3);
        const selectedRoom = candidates[Math.floor(Math.random() * candidates.length)];

        // Find position in room
        const pos = this._findValidPosition(selectedRoom);
        if (!pos) return null;

        console.log(`[ExtractionSpawner] Path down placed at (${pos.x}, ${pos.y}) in room ${selectedRoom.id}`);

        return {
            x: pos.x,
            y: pos.y,
            roomId: selectedRoom.id
        };
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.ExtractionSpawner = ExtractionSpawner;

console.log('[ExtractionSpawner] Extraction spawner loaded');
