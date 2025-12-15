// ============================================================================
// CAMPFIRE SYSTEM - Deployment helper for placeable light sources
// ============================================================================
// Thin wrapper that handles position validation and deployment of campfires.
// Actual light and healing logic is handled by LightSourceSystem.
// ============================================================================

const CampfireSystem = {
    // Track deployed campfires for map marking
    deployedCampfires: [],
    nextId: 1,

    /**
     * Initialize the system
     */
    init() {
        this.deployedCampfires = [];
        this.nextId = 1;
        console.log('[CampfireSystem] Initialized');
    },

    /**
     * Deploy a campfire at the given position
     * @param {number} gridX - Grid X position
     * @param {number} gridY - Grid Y position
     * @param {string} type - Light source type (default: 'campfire')
     * @returns {boolean} Success
     */
    deployCampfire(gridX, gridY, type = 'campfire') {
        // Validate position
        if (!this._isValidPosition(gridX, gridY)) {
            console.log('[CampfireSystem] Invalid position for campfire');
            return false;
        }

        // Check if there's already a campfire here
        if (this._hasCampfireAt(gridX, gridY)) {
            console.log('[CampfireSystem] Campfire already exists at this position');
            return false;
        }

        const campfireId = `deployed_campfire_${this.nextId++}`;

        // Add light source via LightSourceSystem (handles light + healing)
        if (typeof LightSourceSystem !== 'undefined') {
            LightSourceSystem.addSource({
                id: campfireId,
                type: type,
                gridX: gridX,
                gridY: gridY
                // Uses defaults from SOURCE_CONFIGS for the type
            });
        }

        // Track deployment
        const campfire = {
            id: campfireId,
            gridX: gridX,
            gridY: gridY,
            type: type,
            createdAt: Date.now()
        };
        this.deployedCampfires.push(campfire);

        // Mark map tile for rendering
        if (game.map?.[gridY]?.[gridX]) {
            game.map[gridY][gridX].campfire = campfire;
        }

        console.log(`[CampfireSystem] Deployed ${type} at (${gridX}, ${gridY})`);

        // Show status text
        if (typeof showStatusText === 'function' && game.player) {
            showStatusText(game.player, 'Campfire placed!', '#FF8844');
        }

        return true;
    },

    /**
     * Remove a deployed campfire
     * @param {string} campfireId - ID of campfire to remove
     */
    removeCampfire(campfireId) {
        const index = this.deployedCampfires.findIndex(c => c.id === campfireId);
        if (index === -1) return;

        const campfire = this.deployedCampfires[index];

        // Remove from LightSourceSystem
        if (typeof LightSourceSystem !== 'undefined') {
            LightSourceSystem.removeSource(campfireId);
        }

        // Remove from map tile
        if (game.map?.[campfire.gridY]?.[campfire.gridX]) {
            delete game.map[campfire.gridY][campfire.gridX].campfire;
        }

        this.deployedCampfires.splice(index, 1);
        console.log(`[CampfireSystem] Removed campfire ${campfireId}`);
    },

    /**
     * Check if position is valid for campfire placement
     * @param {number} gridX
     * @param {number} gridY
     * @returns {boolean}
     */
    _isValidPosition(gridX, gridY) {
        if (!game.map) return false;

        const tile = game.map[gridY]?.[gridX];
        if (!tile) return false;

        // Must be on floor tile
        if (tile.type !== 'floor') return false;

        // Can't place on hazards
        if (tile.hazard) return false;

        // Can't place on blocking decorations
        if (typeof hasBlockingDecorationAt === 'function' && hasBlockingDecorationAt(gridX, gridY)) {
            return false;
        }

        return true;
    },

    /**
     * Check if there's already a campfire at position
     * @param {number} gridX
     * @param {number} gridY
     * @returns {boolean}
     */
    _hasCampfireAt(gridX, gridY) {
        return this.deployedCampfires.some(c => c.gridX === gridX && c.gridY === gridY);
    },

    /**
     * Get all deployed campfires
     * @returns {Array}
     */
    getCampfires() {
        return [...this.deployedCampfires];
    },

    /**
     * Clear all deployed campfires (for level reset)
     */
    clearAll() {
        for (const campfire of this.deployedCampfires) {
            if (typeof LightSourceSystem !== 'undefined') {
                LightSourceSystem.removeSource(campfire.id);
            }
            if (game.map?.[campfire.gridY]?.[campfire.gridX]) {
                delete game.map[campfire.gridY][campfire.gridX].campfire;
            }
        }
        this.deployedCampfires = [];
        console.log('[CampfireSystem] All campfires cleared');
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION (minimal - just for cleanup)
// ============================================================================

const CampfireSystemDef = {
    name: 'campfire-system',

    init(gameRef) {
        CampfireSystem.init();
    },

    update(dt) {
        // No update needed - LightSourceSystem handles healing
    },

    cleanup() {
        CampfireSystem.clearAll();
    }
};

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('campfire-system', CampfireSystemDef, 50);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.CampfireSystem = CampfireSystem;

console.log('[CampfireSystem] Deployment helper loaded');
