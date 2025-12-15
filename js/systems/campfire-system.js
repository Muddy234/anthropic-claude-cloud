// ============================================================================
// CAMPFIRE SYSTEM - Deployable rest points with healing and light
// ============================================================================

const CampfireSystem = {
    // Configuration
    config: {
        healRadius: 2,           // Tiles - how close player must be to heal
        lightRadius: 5,          // Tiles - light radius (torch-like)
        healPercentPerSecond: 1, // 1% of max HP per second
        healTickInterval: 1000,  // Heal every 1 second
        lightColor: '#ff6622',   // Warm orange fire color
        lightIntensity: 0.9      // Slightly dimmer than full brightness
    },

    // Active campfires
    campfires: [],

    // Track healing tick
    healTickTimer: 0,

    // Unique ID counter
    nextId: 1,

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    init() {
        this.campfires = [];
        this.healTickTimer = 0;
        this.nextId = 1;
        console.log('[CampfireSystem] Initialized');
    },

    // ========================================================================
    // DEPLOYMENT
    // ========================================================================

    /**
     * Deploy a campfire at the given position
     * @param {number} gridX - Grid X position
     * @param {number} gridY - Grid Y position
     * @returns {boolean} Success
     */
    deployCampfire(gridX, gridY) {
        // Check if position is valid (on floor tile)
        if (!this._isValidPosition(gridX, gridY)) {
            console.log('[CampfireSystem] Invalid position for campfire');
            return false;
        }

        // Check if there's already a campfire here
        if (this._hasCampfireAt(gridX, gridY)) {
            console.log('[CampfireSystem] Campfire already exists at this position');
            return false;
        }

        const campfireId = `campfire_${this.nextId++}`;

        // Create campfire entity
        const campfire = {
            id: campfireId,
            gridX: gridX,
            gridY: gridY,
            lightSourceId: null,
            createdAt: Date.now()
        };

        // Register light source with LightSourceSystem
        if (typeof LightSourceSystem !== 'undefined') {
            campfire.lightSourceId = LightSourceSystem.addSource({
                id: campfireId,
                type: 'campfire',
                gridX: gridX,
                gridY: gridY,
                radius: this.config.lightRadius,
                intensity: this.config.lightIntensity,
                color: this.config.lightColor,
                flicker: true,
                fuel: Infinity,      // Never burns out
                permanent: true      // Permanent fixture
            });
        }

        // Add to campfires array
        this.campfires.push(campfire);

        // Add visual marker to the map tile (for rendering)
        if (game.map?.[gridY]?.[gridX]) {
            game.map[gridY][gridX].campfire = campfire;
        }

        console.log(`[CampfireSystem] Deployed campfire at (${gridX}, ${gridY})`);

        // Show status text
        if (typeof showStatusText === 'function' && game.player) {
            showStatusText(game.player, 'Campfire placed!', '#FF8844');
        }

        return true;
    },

    /**
     * Remove a campfire
     * @param {string} campfireId - ID of campfire to remove
     */
    removeCampfire(campfireId) {
        const index = this.campfires.findIndex(c => c.id === campfireId);
        if (index === -1) return;

        const campfire = this.campfires[index];

        // Remove light source
        if (typeof LightSourceSystem !== 'undefined' && campfire.lightSourceId) {
            LightSourceSystem.removeSource(campfire.lightSourceId);
        }

        // Remove from map tile
        if (game.map?.[campfire.gridY]?.[campfire.gridX]) {
            delete game.map[campfire.gridY][campfire.gridX].campfire;
        }

        // Remove from array
        this.campfires.splice(index, 1);

        console.log(`[CampfireSystem] Removed campfire ${campfireId}`);
    },

    // ========================================================================
    // UPDATE LOOP
    // ========================================================================

    /**
     * Update campfire system - heals nearby players when out of combat
     * @param {number} dt - Delta time in milliseconds
     */
    update(dt) {
        if (!game.player || game.player.hp <= 0) return;

        // Update heal tick timer
        this.healTickTimer += dt;

        // Only heal on tick interval
        if (this.healTickTimer < this.config.healTickInterval) return;
        this.healTickTimer = 0;

        // Check if player is in combat
        if (this._isPlayerInCombat()) return;

        // Check if player is near any campfire
        const player = game.player;
        const nearestCampfire = this._getNearestCampfire(player.gridX, player.gridY);

        if (!nearestCampfire) return;

        const distance = this._getDistance(player.gridX, player.gridY, nearestCampfire.gridX, nearestCampfire.gridY);

        if (distance <= this.config.healRadius) {
            this._healPlayer(player);
        }
    },

    // ========================================================================
    // HEALING
    // ========================================================================

    /**
     * Heal player by percentage of max HP
     * @param {Object} player - Player entity
     */
    _healPlayer(player) {
        // Don't heal if at full HP
        if (player.hp >= player.maxHp) return;

        // Calculate heal amount (1% of max HP)
        const healAmount = Math.max(1, Math.floor(player.maxHp * (this.config.healPercentPerSecond / 100)));
        const actualHeal = Math.min(healAmount, player.maxHp - player.hp);

        player.hp += actualHeal;

        // Show heal number
        if (typeof showDamageNumber === 'function' && actualHeal > 0) {
            showDamageNumber(player, actualHeal, '#88FF88');
        }
    },

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Check if player is in combat
     * @returns {boolean}
     */
    _isPlayerInCombat() {
        const player = game.player;
        if (!player) return false;

        // Check both combat flags
        return player.inCombat === true || player.combat?.isInCombat === true;
    },

    /**
     * Check if position is valid for campfire
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

        // Can't place on decorations that block
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
        return this.campfires.some(c => c.gridX === gridX && c.gridY === gridY);
    },

    /**
     * Get nearest campfire to position
     * @param {number} gridX
     * @param {number} gridY
     * @returns {Object|null}
     */
    _getNearestCampfire(gridX, gridY) {
        if (this.campfires.length === 0) return null;

        let nearest = null;
        let nearestDist = Infinity;

        for (const campfire of this.campfires) {
            const dist = this._getDistance(gridX, gridY, campfire.gridX, campfire.gridY);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = campfire;
            }
        }

        return nearest;
    },

    /**
     * Calculate distance between two points
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @returns {number}
     */
    _getDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    /**
     * Get all active campfires
     * @returns {Array}
     */
    getCampfires() {
        return [...this.campfires];
    },

    /**
     * Clear all campfires (for level reset)
     */
    clearAll() {
        // Remove all light sources
        for (const campfire of this.campfires) {
            if (typeof LightSourceSystem !== 'undefined' && campfire.lightSourceId) {
                LightSourceSystem.removeSource(campfire.lightSourceId);
            }
            // Remove from map tile
            if (game.map?.[campfire.gridY]?.[campfire.gridX]) {
                delete game.map[campfire.gridY][campfire.gridX].campfire;
            }
        }
        this.campfires = [];
        console.log('[CampfireSystem] All campfires cleared');
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const CampfireSystemDef = {
    name: 'campfire-system',

    init(gameRef) {
        CampfireSystem.init();
    },

    update(dt) {
        CampfireSystem.update(dt);
    },

    cleanup() {
        CampfireSystem.clearAll();
    }
};

// Register with SystemManager if available
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('campfire-system', CampfireSystemDef, 50);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.CampfireSystem = CampfireSystem;

console.log('[CampfireSystem] Campfire system loaded');
