// ============================================================================
// ROOM TYPE SYSTEM - Assignment and Management
// ============================================================================
// Handles assigning special room types to generated rooms and managing
// room-specific features, interactions, and state.
// ============================================================================

const RoomTypeSystem = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    config: {
        debugLogging: true,
        // Spawn chances for optional rooms (when criteria met)
        spawnChances: {
            healing_fire: 0.7,        // 70% chance when slot available
            mirror_chamber: 0.5,      // 50% chance
            sacrifice_altar: 0.6,     // 60% chance
            forgotten_vault: 0.4      // 40% chance (rarer)
        }
    },

    // ========================================================================
    // STATE
    // ========================================================================
    floorRoomTypes: new Map(),        // roomId -> assigned type
    floorFeatures: new Map(),         // roomId -> [features]
    assignedCounts: {},               // typeId -> count this floor
    escapedDoppelganger: null,        // Tracks escaped doppelganger

    // ========================================================================
    // MAIN ASSIGNMENT FUNCTION
    // ========================================================================

    /**
     * Assign room types to all rooms on a floor
     * Called after rooms are generated but before decoration/spawning
     * @param {Array} rooms - Array of room objects
     * @param {number} floorNumber - Current floor number
     * @returns {Map} Room ID to room type mapping
     */
    assignRoomTypes(rooms, floorNumber) {
        this.resetFloorState();

        if (!rooms || rooms.length === 0) {
            console.warn('[RoomTypeSystem] No rooms to assign types to');
            return this.floorRoomTypes;
        }

        const context = {
            totalRooms: rooms.length,
            floorNumber: floorNumber,
            assignedTypes: this.assignedCounts
        };

        // Give each room a unique ID if it doesn't have one
        rooms.forEach((room, index) => {
            if (!room.id) {
                room.id = `room_${floorNumber}_${index}`;
            }
        });

        // Pass 1: Assign required room types (entrance, boss)
        this.assignRequiredTypes(rooms, context);

        // Pass 2: Assign special room types by priority
        this.assignSpecialTypes(rooms, context);

        // Pass 3: Assign standard type to remaining rooms
        this.assignStandardTypes(rooms, context);

        // Pass 4: Apply room type properties to each room
        this.applyRoomTypeProperties(rooms);

        if (this.config.debugLogging) {
            this.logAssignments(rooms, floorNumber);
        }

        return this.floorRoomTypes;
    },

    /**
     * Reset state for new floor
     */
    resetFloorState() {
        this.floorRoomTypes.clear();
        this.floorFeatures.clear();
        this.assignedCounts = {};

        // Initialize counts
        for (const typeId in ROOM_TYPES) {
            this.assignedCounts[typeId] = 0;
        }
    },

    // ========================================================================
    // ASSIGNMENT PASSES
    // ========================================================================

    /**
     * Pass 1: Assign required room types
     */
    assignRequiredTypes(rooms, context) {
        // Entrance is always first room
        if (rooms.length > 0) {
            this.assignType(rooms[0], 'entrance', context);
        }

        // Boss room - find best candidate (large, preferably dead-end)
        const bossCandidate = this.findBestBossRoom(rooms, context);
        if (bossCandidate) {
            this.assignType(bossCandidate, 'boss_room', context);
        }
    },

    /**
     * Pass 2: Assign special room types by priority
     */
    assignSpecialTypes(rooms, context) {
        const specialTypes = ['forgotten_vault', 'mirror_chamber', 'sacrifice_altar', 'healing_fire'];

        for (const typeId of specialTypes) {
            const typeDef = ROOM_TYPES[typeId];
            if (!typeDef) continue;

            const maxCount = typeDef.criteria.maxPerFloor;
            let assigned = 0;

            // Find candidate rooms for this type
            const candidates = rooms.filter(room => {
                // Skip already assigned rooms
                if (this.floorRoomTypes.has(room.id)) return false;

                // Check if room meets criteria
                const roomContext = {
                    ...context,
                    roomIndex: rooms.indexOf(room),
                    assignedTypes: this.assignedCounts
                };

                return roomMeetsCriteria(room, typeId, roomContext);
            });

            // Sort candidates by preference
            this.sortCandidatesByPreference(candidates, typeDef);

            // Assign to best candidates up to max
            for (const candidate of candidates) {
                if (assigned >= maxCount) break;

                // Check spawn chance for optional rooms
                const spawnChance = this.config.spawnChances[typeId] || 1.0;
                if (Math.random() > spawnChance) continue;

                this.assignType(candidate, typeId, context);
                assigned++;
            }
        }
    },

    /**
     * Pass 3: Assign standard type to remaining rooms
     */
    assignStandardTypes(rooms, context) {
        for (const room of rooms) {
            if (!this.floorRoomTypes.has(room.id)) {
                this.assignType(room, 'standard', context);
            }
        }
    },

    /**
     * Pass 4: Apply room type properties to room objects
     */
    applyRoomTypeProperties(rooms) {
        for (const room of rooms) {
            const typeId = this.floorRoomTypes.get(room.id);
            const typeDef = ROOM_TYPES[typeId];

            if (!typeDef) continue;

            // Apply properties
            room.roomType = typeId;
            room.roomTypeName = typeDef.name;
            room.hasEnemies = typeDef.properties.hasEnemies;
            room.isSafeZone = typeDef.properties.isSafeZone || false;
            room.isLocked = typeDef.properties.isLocked || false;
            room.lockOnEntry = typeDef.properties.lockOnEntry || false;
            room.unlockOnClear = typeDef.properties.unlockOnClear || false;
            room.isOptional = typeDef.properties.isOptional || false;
            room.elementPower = typeDef.properties.elementPower || 2;
            room.decorationDensity = typeDef.decorationDensity || 1.0;

            // Store features
            room.features = typeDef.features || [];
            this.floorFeatures.set(room.id, [...room.features]);

            // Apply preferred element if specified
            if (typeDef.properties.preferredElements && typeDef.properties.preferredElements.length > 0) {
                const preferred = typeDef.properties.preferredElements;
                room.element = preferred[Math.floor(Math.random() * preferred.length)];
            }
        }
    },

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    /**
     * Assign a type to a room
     */
    assignType(room, typeId, context) {
        this.floorRoomTypes.set(room.id, typeId);
        this.assignedCounts[typeId] = (this.assignedCounts[typeId] || 0) + 1;

        if (this.config.debugLogging) {
            console.log(`[RoomTypeSystem] Assigned ${typeId} to room ${room.id}`);
        }
    },

    /**
     * Find best room for boss
     */
    findBestBossRoom(rooms, context) {
        const candidates = rooms.filter((room, index) => {
            // Skip entrance
            if (index === 0) return false;

            // Skip already assigned
            if (this.floorRoomTypes.has(room.id)) return false;

            // Check size
            const size = Math.min(room.floorWidth || 36, room.floorHeight || 36);
            if (size < 32) return false;

            // Check room index (not too early)
            if (index < 3) return false;

            return true;
        });

        if (candidates.length === 0) {
            // Fallback: use last large enough room
            for (let i = rooms.length - 1; i >= 1; i--) {
                const room = rooms[i];
                if (!this.floorRoomTypes.has(room.id)) {
                    const size = Math.min(room.floorWidth || 36, room.floorHeight || 36);
                    if (size >= 28) return room;
                }
            }
            return null;
        }

        // Prefer dead-end rooms
        const deadEnds = candidates.filter(r => (r.connectedRooms?.length || 0) <= 1);
        if (deadEnds.length > 0) {
            return deadEnds[Math.floor(Math.random() * deadEnds.length)];
        }

        return candidates[Math.floor(Math.random() * candidates.length)];
    },

    /**
     * Sort candidates by preference for a room type
     */
    sortCandidatesByPreference(candidates, typeDef) {
        candidates.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;

            // Prefer dead ends if specified
            if (typeDef.criteria.preferDeadEnd) {
                const aIsDeadEnd = (a.connectedRooms?.length || 0) <= 1;
                const bIsDeadEnd = (b.connectedRooms?.length || 0) <= 1;
                if (aIsDeadEnd) scoreA += 10;
                if (bIsDeadEnd) scoreB += 10;
            }

            // Prefer smaller rooms for small room types
            if (typeDef.criteria.maxRoomSize <= 26) {
                const sizeA = Math.min(a.floorWidth || 36, a.floorHeight || 36);
                const sizeB = Math.min(b.floorWidth || 36, b.floorHeight || 36);
                scoreA += (36 - sizeA);
                scoreB += (36 - sizeB);
            }

            // Prefer matching element if specified
            if (typeDef.properties.preferredElements) {
                if (typeDef.properties.preferredElements.includes(a.element)) scoreA += 5;
                if (typeDef.properties.preferredElements.includes(b.element)) scoreB += 5;
            }

            return scoreB - scoreA;  // Higher score first
        });
    },

    /**
     * Log assignment summary
     */
    logAssignments(rooms, floorNumber) {
        console.log(`[RoomTypeSystem] Floor ${floorNumber} assignments:`);
        for (const [typeId, count] of Object.entries(this.assignedCounts)) {
            if (count > 0) {
                console.log(`  - ${typeId}: ${count}`);
            }
        }
    },

    // ========================================================================
    // ROOM STATE QUERIES
    // ========================================================================

    /**
     * Get room type for a room
     */
    getRoomType(roomId) {
        return this.floorRoomTypes.get(roomId) || 'standard';
    },

    /**
     * Get room type definition for a room
     */
    getRoomTypeDefinition(roomId) {
        const typeId = this.getRoomType(roomId);
        return ROOM_TYPES[typeId];
    },

    /**
     * Check if room has a specific feature
     */
    roomHasFeature(roomId, featureId) {
        const features = this.floorFeatures.get(roomId) || [];
        return features.includes(featureId);
    },

    /**
     * Get all features for a room
     */
    getRoomFeatures(roomId) {
        return this.floorFeatures.get(roomId) || [];
    },

    /**
     * Get rooms of a specific type
     */
    getRoomsOfType(typeId) {
        const rooms = [];
        for (const [roomId, assignedType] of this.floorRoomTypes) {
            if (assignedType === typeId) {
                rooms.push(roomId);
            }
        }
        return rooms;
    },

    /**
     * Get count of a room type on current floor
     */
    getTypeCount(typeId) {
        return this.assignedCounts[typeId] || 0;
    },

    // ========================================================================
    // DOPPELGANGER TRACKING
    // ========================================================================

    /**
     * Mark doppelganger as escaped (will hunt player)
     */
    setDoppelgangerEscaped(doppelgangerData) {
        this.escapedDoppelganger = {
            ...doppelgangerData,
            escaped: true,
            escapedFloor: game.floor || 1,
            huntTimer: 0
        };

        if (this.config.debugLogging) {
            console.log('[RoomTypeSystem] Doppelganger escaped! It will hunt the player.');
        }
    },

    /**
     * Check if there's an escaped doppelganger hunting
     */
    hasEscapedDoppelganger() {
        return this.escapedDoppelganger !== null && this.escapedDoppelganger.escaped;
    },

    /**
     * Get escaped doppelganger data
     */
    getEscapedDoppelganger() {
        return this.escapedDoppelganger;
    },

    /**
     * Clear escaped doppelganger (after defeat)
     */
    clearEscapedDoppelganger() {
        this.escapedDoppelganger = null;
    },

    // ========================================================================
    // ROOM INTERACTION HELPERS
    // ========================================================================

    /**
     * Check if player can interact with room feature
     */
    canInteractWithFeature(room, featureId) {
        if (!room || !featureId) return false;

        const features = this.floorFeatures.get(room.id) || [];
        if (!features.includes(featureId)) return false;

        const featureDef = ROOM_FEATURES[featureId];
        if (!featureDef || !featureDef.interactable) return false;

        // Check specific requirements
        if (featureId === 'exit_stairs' && featureDef.requiresBossDefeated) {
            return room.cleared === true;
        }

        return true;
    },

    /**
     * Get interaction type for a feature
     */
    getFeatureInteraction(featureId) {
        const featureDef = ROOM_FEATURES[featureId];
        return featureDef?.interaction || null;
    },

    // ========================================================================
    // CLEANUP
    // ========================================================================

    /**
     * Clean up when leaving floor
     */
    cleanup() {
        this.floorRoomTypes.clear();
        this.floorFeatures.clear();
        this.assignedCounts = {};
        // Note: escapedDoppelganger persists across floors
    },

    /**
     * Full reset (new game)
     */
    reset() {
        this.cleanup();
        this.escapedDoppelganger = null;
    }
};

// ============================================================================
// SYSTEM MANAGER INTEGRATION
// ============================================================================

const RoomTypeSystemDef = {
    name: 'room-type-system',

    init() {
        RoomTypeSystem.reset();
        if (RoomTypeSystem.config.debugLogging) {
            console.log('[RoomTypeSystem] Initialized');
        }
    },

    update(dt) {
        // Update escaped doppelganger hunt timer if applicable
        if (RoomTypeSystem.hasEscapedDoppelganger()) {
            RoomTypeSystem.escapedDoppelganger.huntTimer += dt;
        }
    },

    cleanup() {
        RoomTypeSystem.cleanup();
    }
};

// Register with SystemManager (priority 10 - early, before room generation)
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('room-type-system', RoomTypeSystemDef, 10);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.RoomTypeSystem = RoomTypeSystem;
}

console.log('✅ Room Type System loaded');
