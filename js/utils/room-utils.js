// ============================================================================
// ROOM UTILITIES - The Shifting Chasm
// ============================================================================
// Consolidated room-finding functions (previously duplicated across files)
// ============================================================================

const RoomUtils = {
    // Cache for room lookups (cleared on floor change)
    _cache: new Map(),
    _cacheFloor: -1,

    /**
     * Get the room containing a given position or entity
     * @param {Object} entityOrPos - Entity with gridX/gridY or position object with x/y
     * @param {Object} gameRef - Optional game reference (uses global 'game' if not provided)
     * @returns {Object|null} The room object or null if not in a room
     */
    getCurrentRoom(entityOrPos, gameRef = null) {
        const g = gameRef || (typeof game !== 'undefined' ? game : null);
        if (!g?.rooms) return null;

        // Clear cache on floor change
        if (g.currentFloor !== this._cacheFloor) {
            this._cache.clear();
            this._cacheFloor = g.currentFloor;
        }

        // Get coordinates (support both entity and position objects)
        const x = entityOrPos.gridX ?? entityOrPos.x;
        const y = entityOrPos.gridY ?? entityOrPos.y;

        if (x === undefined || y === undefined) return null;

        // Check cache first
        const cacheKey = `${Math.floor(x)},${Math.floor(y)}`;
        if (this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey);
        }

        // Search rooms
        for (const room of g.rooms) {
            const rx = room.floorX ?? room.x;
            const ry = room.floorY ?? room.y;
            const rw = room.floorWidth ?? room.width;
            const rh = room.floorHeight ?? room.height;

            if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) {
                this._cache.set(cacheKey, room);
                return room;
            }
        }

        // Not in any room - cache the null result too
        this._cache.set(cacheKey, null);
        return null;
    },

    /**
     * Check if two entities are in the same room
     * @param {Object} entity1 - First entity
     * @param {Object} entity2 - Second entity
     * @param {Object} gameRef - Optional game reference
     * @returns {boolean} True if both entities are in the same room
     */
    areInSameRoom(entity1, entity2, gameRef = null) {
        const room1 = this.getCurrentRoom(entity1, gameRef);
        const room2 = this.getCurrentRoom(entity2, gameRef);

        if (!room1 || !room2) return false;
        return room1 === room2;
    },

    /**
     * Get all entities in a specific room
     * @param {Object} room - The room to check
     * @param {Object} gameRef - Optional game reference
     * @returns {Object} Object with player (if in room) and enemies array
     */
    getEntitiesInRoom(room, gameRef = null) {
        const g = gameRef || (typeof game !== 'undefined' ? game : null);
        const result = {
            player: null,
            enemies: []
        };

        if (!g || !room) return result;

        // Check player
        if (g.player && this.getCurrentRoom(g.player, g) === room) {
            result.player = g.player;
        }

        // Check enemies
        if (g.enemies) {
            for (const enemy of g.enemies) {
                if (enemy.hp > 0 && this.getCurrentRoom(enemy, g) === room) {
                    result.enemies.push(enemy);
                }
            }
        }

        return result;
    },

    /**
     * Clear the room cache (call on floor transitions)
     */
    clearCache() {
        this._cache.clear();
        this._cacheFloor = -1;
    }
};

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

// Export for module systems
if (typeof window !== 'undefined') {
    window.RoomUtils = RoomUtils;

    // Also export getCurrentRoom as standalone function for backwards compatibility
    window.getCurrentRoom = function(entity) {
        return RoomUtils.getCurrentRoom(entity);
    };
}

console.log('[RoomUtils] Room utilities loaded');
