// === js/systems/village-system.js ===
// SURVIVAL EXTRACTION UPDATE: Village hub management

// ============================================================================
// VILLAGE SYSTEM
// ============================================================================

const VillageSystem = {

    // State
    initialized: false,
    villageData: null,

    // Movement settings
    moveSpeed: 0.15,
    inputBuffer: { x: 0, y: 0 },
    lastMoveTime: 0,
    moveCooldown: 100,  // ms between moves

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize the village
     * @param {number} degradationLevel - Optional degradation level (0-2)
     */
    init(degradationLevel = 0) {
        // Use persistent state degradation if available
        const degradation = degradationLevel ||
            (typeof persistentState !== 'undefined' ? persistentState.village?.degradationLevel : 0) || 0;

        console.log(`[VillageSystem] Initializing village (degradation: ${degradation})`);

        // Generate village map
        this.villageData = VillageGenerator.generate(degradation);

        // Set up village state
        if (typeof villageState !== 'undefined') {
            villageState.map = this.villageData.map;
            villageState.buildings = this.villageData.buildings;
            villageState.player = {
                x: this.villageData.spawnPoint.x,
                y: this.villageData.spawnPoint.y,
                displayX: this.villageData.spawnPoint.x,
                displayY: this.villageData.spawnPoint.y,
                facingX: 0,
                facingY: 1
            };

            // Spawn NPCs
            this._spawnNPCs();
        }

        // Set up input handling
        this._setupInput();

        this.initialized = true;
        console.log('[VillageSystem] Village initialized');
    },

    /**
     * Spawn NPCs at their positions
     * @private
     */
    _spawnNPCs() {
        const npcPositions = VillageGenerator.getNPCPositions(this.villageData.buildings);

        villageState.npcs = npcPositions.map(pos => {
            return createNPC(pos.npcId, pos.x, pos.y);
        }).filter(npc => npc !== null);

        console.log(`[VillageSystem] Spawned ${villageState.npcs.length} NPCs`);
    },

    /**
     * Set up keyboard input handling
     * @private
     */
    _setupInput() {
        // Remove any existing village listener
        if (this._keyHandler) {
            window.removeEventListener('keydown', this._keyHandler);
        }

        this._keyHandler = (e) => this._handleKeyDown(e);
        window.addEventListener('keydown', this._keyHandler);
    },

    /**
     * Handle keydown events
     * @param {KeyboardEvent} e
     * @private
     */
    _handleKeyDown(e) {
        if (game.state !== 'village' && game.state !== 'dialogue' && game.state !== 'journal') return;

        // Handle journal input first
        if (game.state === 'journal' && typeof JournalUI !== 'undefined') {
            JournalUI.handleInput(e.key);
            e.preventDefault();
            return;
        }

        // Handle dialogue input
        if (game.state === 'dialogue' && typeof DialogueUI !== 'undefined') {
            DialogueUI.handleInput(e.key);
            return;
        }

        // Village movement and interaction
        switch (e.key) {
            case 'w':
            case 'W':
            case 'ArrowUp':
                this._tryMove(0, -1);
                break;

            case 's':
            case 'S':
            case 'ArrowDown':
                this._tryMove(0, 1);
                break;

            case 'a':
            case 'A':
            case 'ArrowLeft':
                this._tryMove(-1, 0);
                break;

            case 'd':
            case 'D':
            case 'ArrowRight':
                this._tryMove(1, 0);
                break;

            case 'e':
            case 'E':
            case 'Enter':
                this._tryInteract();
                break;

            case 'Escape':
                // Open menu or close dialogue
                if (typeof DialogueUI !== 'undefined' && DialogueUI.active) {
                    DialogueUI.close();
                }
                break;
        }
    },

    /**
     * Try to move the player
     * @param {number} dx
     * @param {number} dy
     * @private
     */
    _tryMove(dx, dy) {
        if (!villageState || !villageState.player) return;

        const now = Date.now();
        if (now - this.lastMoveTime < this.moveCooldown) return;

        const player = villageState.player;
        const newX = player.x + dx;
        const newY = player.y + dy;

        // Update facing direction
        player.facingX = dx;
        player.facingY = dy;

        // Check bounds
        if (newX < 0 || newX >= VillageGenerator.WIDTH ||
            newY < 0 || newY >= VillageGenerator.HEIGHT) {
            return;
        }

        // Check walkable
        const tile = villageState.map[newY]?.[newX];
        if (!tile || !tile.walkable) {
            return;
        }

        // Move player
        player.x = newX;
        player.y = newY;
        this.lastMoveTime = now;

        // Check for chasm entrance
        if (VillageGenerator.isChasmEntrance(villageState.map, newX, newY)) {
            this._onChasmEntrance();
        }
    },

    /**
     * Try to interact with nearby NPC or object
     * @private
     */
    _tryInteract() {
        if (!villageState || !villageState.player || !villageState.npcs) return;

        const player = villageState.player;
        const interactionRange = 1.5;

        // Find nearby NPC
        for (const npc of villageState.npcs) {
            const dx = npc.x - player.x;
            const dy = npc.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= interactionRange) {
                this._interactWithNPC(npc);
                return;
            }
        }

        // Check for building interaction
        const buildingId = VillageGenerator.getBuildingAt(villageState.map, player.x, player.y);
        if (buildingId) {
            this._interactWithBuilding(buildingId);
        }
    },

    /**
     * Interact with an NPC
     * @param {Object} npc
     * @private
     */
    _interactWithNPC(npc) {
        console.log(`[VillageSystem] Interacting with ${npc.name}`);

        if (typeof DialogueUI !== 'undefined') {
            DialogueUI.open(npc);
        }
    },

    /**
     * Interact with a building
     * @param {string} buildingId
     * @private
     */
    _interactWithBuilding(buildingId) {
        console.log(`[VillageSystem] Interacting with building: ${buildingId}`);

        switch (buildingId) {
            case 'bank':
                game.state = GAME_STATES ? GAME_STATES.BANK : 'bank';
                break;

            case 'chasm_entrance':
                this._onChasmEntrance();
                break;

            default:
                // No direct building interaction
                break;
        }
    },

    /**
     * Handle entering the chasm
     * @private
     */
    _onChasmEntrance() {
        console.log('[VillageSystem] Player at chasm entrance');

        // Open loadout selection UI
        if (typeof LoadoutUI !== 'undefined') {
            LoadoutUI.open();
        } else {
            // Fallback: set state directly
            game.state = GAME_STATES ? GAME_STATES.LOADOUT : 'loadout';
        }
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render the village
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.initialized || !villageState) return;

        // Smooth player display position
        if (villageState.player) {
            const lerp = 0.2;
            villageState.player.displayX += (villageState.player.x - villageState.player.displayX) * lerp;
            villageState.player.displayY += (villageState.player.y - villageState.player.displayY) * lerp;
        }

        // Render village map and entities
        if (typeof VillageRenderer !== 'undefined') {
            VillageRenderer.render(ctx, villageState, villageState.player, {});
            VillageRenderer.renderUI(ctx, villageState);
        }

        // Render dialogue if active
        if (typeof DialogueUI !== 'undefined' && DialogueUI.active) {
            DialogueUI.render(ctx);
        }
    },

    // ========================================================================
    // QUERIES
    // ========================================================================

    /**
     * Get building the player is in
     * @returns {Object|null}
     */
    getCurrentBuilding() {
        if (!villageState || !villageState.player) return null;

        const buildingId = VillageGenerator.getBuildingAt(
            villageState.map,
            villageState.player.x,
            villageState.player.y
        );

        if (buildingId) {
            return VillageGenerator.getBuildingById(this.villageData.buildings, buildingId);
        }

        return null;
    },

    /**
     * Get nearest NPC
     * @returns {Object|null}
     */
    getNearestNPC() {
        if (!villageState || !villageState.player || !villageState.npcs) return null;

        let nearest = null;
        let nearestDist = Infinity;

        villageState.npcs.forEach(npc => {
            const dx = npc.x - villageState.player.x;
            const dy = npc.y - villageState.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = npc;
            }
        });

        return nearest;
    },

    // ========================================================================
    // CLEANUP
    // ========================================================================

    /**
     * Clean up village system
     */
    cleanup() {
        if (this._keyHandler) {
            window.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }

        this.villageData = null;
        this.initialized = false;

        console.log('[VillageSystem] Cleaned up');
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.VillageSystem = VillageSystem;

console.log('[VillageSystem] Village system loaded');
