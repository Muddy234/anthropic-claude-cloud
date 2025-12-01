// ============================================================================
// ATTUNEMENT SYSTEM - Player Element Affinity & Room Bonuses
// ============================================================================
// Tracks player's elemental attunement based on:
// - Equipped gear elements
// - Time spent in elemental rooms
// - Active status effects
// ============================================================================

const AttunementSystem = {
    // Configuration
    config: {
        maxAttunement: 100,
        decayRate: 1,               // Points lost per second when not in matching room
        gainRate: 2,                // Points gained per second in matching room
        equipmentWeight: 0.4,       // 40% of attunement from gear
        roomWeight: 0.4,            // 40% from current room
        historyWeight: 0.2,         // 20% from recent room history
        thresholds: {
            weak: 25,               // 25+ for weak attunement
            moderate: 50,           // 50+ for moderate
            strong: 75,             // 75+ for strong
            perfect: 100            // 100 for perfect
        },
        bonuses: {
            weak: 0.05,             // 5% damage bonus
            moderate: 0.10,         // 10% damage bonus
            strong: 0.15,           // 15% damage bonus
            perfect: 0.25           // 25% damage bonus
        },
        debugLogging: true
    },

    // Player attunement state
    playerAttunement: {
        primary: null,              // Dominant element
        values: {},                 // Element -> attunement value (0-100)
        roomHistory: [],            // Recent rooms visited
        lastUpdate: 0
    },

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    init() {
        this.resetAttunement();
        console.log('[Attunement] System initialized');
    },

    resetAttunement() {
        this.playerAttunement = {
            primary: null,
            values: {
                fire: 0, ice: 0, water: 0, earth: 0, nature: 0,
                death: 0, arcane: 0, dark: 0, holy: 0, physical: 0
            },
            roomHistory: [],
            lastUpdate: performance.now()
        };
    },

    // ========================================================================
    // UPDATE LOOP
    // ========================================================================

    update(deltaTime, player, currentRoom) {
        if (!player) return;

        const dt = deltaTime / 1000; // Convert to seconds

        // Get current room element
        const roomElement = currentRoom?.element || null;

        // Update room history
        if (roomElement && this.playerAttunement.roomHistory[0] !== roomElement) {
            this.playerAttunement.roomHistory.unshift(roomElement);
            if (this.playerAttunement.roomHistory.length > 10) {
                this.playerAttunement.roomHistory.pop();
            }
        }

        // Decay all attunements
        for (const element in this.playerAttunement.values) {
            if (element !== roomElement) {
                this.playerAttunement.values[element] = Math.max(
                    0,
                    this.playerAttunement.values[element] - this.config.decayRate * dt
                );
            }
        }

        // Gain attunement for current room element
        if (roomElement) {
            this.playerAttunement.values[roomElement] = Math.min(
                this.config.maxAttunement,
                this.playerAttunement.values[roomElement] + this.config.gainRate * dt
            );
        }

        // Recalculate primary element
        this.updatePrimaryElement();

        this.playerAttunement.lastUpdate = performance.now();
    },

    // ========================================================================
    // ATTUNEMENT CALCULATION
    // ========================================================================

    /**
     * Calculate total attunement for an element
     * Combines equipment, room exposure, and history
     */
    calculateAttunement(player, element) {
        let total = 0;

        // Component 1: Equipment (40%)
        const equipmentAttunement = this.getEquipmentAttunement(player, element);
        total += equipmentAttunement * this.config.equipmentWeight * this.config.maxAttunement;

        // Component 2: Current room exposure (40%)
        const roomAttunement = this.playerAttunement.values[element] || 0;
        total += roomAttunement * this.config.roomWeight;

        // Component 3: Room history (20%)
        const historyAttunement = this.getHistoryAttunement(element);
        total += historyAttunement * this.config.historyWeight * this.config.maxAttunement;

        return Math.min(this.config.maxAttunement, total);
    },

    /**
     * Get attunement from equipped gear
     * Returns 0-1 based on how much gear matches the element
     */
    getEquipmentAttunement(player, element) {
        if (!player?.equipped) return 0;

        let matchingPieces = 0;
        let totalPieces = 0;

        const slots = ['HEAD', 'CHEST', 'LEGS', 'FEET', 'MAIN', 'OFF'];
        
        for (const slot of slots) {
            const item = player.equipped[slot];
            if (item) {
                totalPieces++;
                if (item.element === element) {
                    matchingPieces++;
                    // Bonus for high element power
                    if (item.elementPower >= 3) matchingPieces += 0.5;
                    if (item.elementPower >= 5) matchingPieces += 0.5;
                }
            }
        }

        return totalPieces > 0 ? matchingPieces / totalPieces : 0;
    },

    /**
     * Get attunement from recent room history
     */
    getHistoryAttunement(element) {
        const history = this.playerAttunement.roomHistory;
        if (history.length === 0) return 0;

        let count = 0;
        for (let i = 0; i < history.length; i++) {
            if (history[i] === element) {
                // Recent rooms count more
                count += 1 - (i * 0.1);
            }
        }

        return Math.min(1, count / 5); // Cap at 100%
    },

    /**
     * Update which element is the player's primary attunement
     */
    updatePrimaryElement() {
        let highest = 0;
        let primary = null;

        for (const element in this.playerAttunement.values) {
            const value = this.playerAttunement.values[element];
            if (value > highest) {
                highest = value;
                primary = element;
            }
        }

        // Only set primary if above weak threshold
        if (highest >= this.config.thresholds.weak) {
            this.playerAttunement.primary = primary;
        } else {
            this.playerAttunement.primary = null;
        }
    },

    // ========================================================================
    // BONUSES
    // ========================================================================

    /**
     * Get attunement tier for an element
     */
    getAttunementTier(player, element) {
        const value = this.calculateAttunement(player, element);
        
        if (value >= this.config.thresholds.perfect) return 'perfect';
        if (value >= this.config.thresholds.strong) return 'strong';
        if (value >= this.config.thresholds.moderate) return 'moderate';
        if (value >= this.config.thresholds.weak) return 'weak';
        return 'none';
    },

    /**
     * Get damage bonus from attunement
     */
    getAttunementBonus(player, element) {
        const tier = this.getAttunementTier(player, element);
        return this.config.bonuses[tier] || 0;
    },

    /**
     * Get defense bonus when in attuned room
     */
    getDefenseBonus(player, roomElement) {
        if (!roomElement) return 0;
        
        const tier = this.getAttunementTier(player, roomElement);
        // Defense bonus is half of damage bonus
        return (this.config.bonuses[tier] || 0) / 2;
    },

    /**
     * Check if player has affinity with an element
     */
    hasAffinity(player, element) {
        return this.getAttunementTier(player, element) !== 'none';
    },

    // ========================================================================
    // QUERIES
    // ========================================================================

    /**
     * Get player's current primary element
     */
    getPrimaryElement() {
        return this.playerAttunement.primary;
    },

    /**
     * Get all attunement values
     */
    getAllAttunements(player) {
        const result = {};
        for (const element in this.playerAttunement.values) {
            result[element] = {
                value: this.calculateAttunement(player, element),
                tier: this.getAttunementTier(player, element),
                bonus: this.getAttunementBonus(player, element)
            };
        }
        return result;
    },

    /**
     * Get attunement summary for UI
     */
    getAttunementSummary(player) {
        const primary = this.playerAttunement.primary;
        if (!primary) {
            return { element: null, tier: 'none', value: 0, bonus: 0 };
        }

        return {
            element: primary,
            tier: this.getAttunementTier(player, primary),
            value: Math.floor(this.calculateAttunement(player, primary)),
            bonus: this.getAttunementBonus(player, primary)
        };
    },

    // ========================================================================
    // ROOM INTERACTION
    // ========================================================================

    /**
     * Called when player enters a new room
     */
    onEnterRoom(player, room) {
        if (!room?.element) return;

        // Immediate small boost when entering matching room
        if (this.hasAffinity(player, room.element)) {
            this.playerAttunement.values[room.element] = Math.min(
                this.config.maxAttunement,
                this.playerAttunement.values[room.element] + 5
            );
        }

        if (this.config.debugLogging) {
            console.log(`[Attunement] Entered ${room.element} room. Current: ${this.playerAttunement.primary || 'none'}`);
        }
    },

    /**
     * Get room compatibility message
     */
    getRoomCompatibility(player, room) {
        if (!room?.element) return null;

        const attunement = this.calculateAttunement(player, room.element);
        const tier = this.getAttunementTier(player, room.element);

        if (tier === 'perfect') {
            return { level: 'perfect', message: 'You feel perfectly attuned to this place.' };
        } else if (tier === 'strong') {
            return { level: 'strong', message: 'The room\'s energy flows through you.' };
        } else if (tier === 'moderate') {
            return { level: 'moderate', message: 'You sense a connection to this room.' };
        } else if (tier === 'weak') {
            return { level: 'weak', message: 'You feel a faint resonance here.' };
        }

        // Check for opposing element
        const primary = this.playerAttunement.primary;
        if (primary && typeof isOpposed === 'function' && isOpposed(primary, room.element)) {
            return { level: 'opposed', message: 'This room\'s energy opposes your attunement.' };
        }

        return null;
    },

    // ========================================================================
    // CLEANUP
    // ========================================================================

    cleanup() {
        // Keep attunement values but clear room history on floor change
        this.playerAttunement.roomHistory = [];
    }
};

// ============================================================================
// HELPER FUNCTIONS (Global)
// ============================================================================

function calculatePlayerAttunement(player) {
    return AttunementSystem.getAttunementSummary(player);
}

function getPlayerAttunementBonus(player, element) {
    return AttunementSystem.getAttunementBonus(player, element);
}

function getPlayerPrimaryElement() {
    return AttunementSystem.getPrimaryElement();
}

function hasElementalAffinity(player, element) {
    return AttunementSystem.hasAffinity(player, element);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.AttunementSystem = AttunementSystem;
window.calculatePlayerAttunement = calculatePlayerAttunement;
window.getPlayerAttunementBonus = getPlayerAttunementBonus;
window.getPlayerPrimaryElement = getPlayerPrimaryElement;
window.hasElementalAffinity = hasElementalAffinity;

console.log('[AttunementSystem] Loaded');