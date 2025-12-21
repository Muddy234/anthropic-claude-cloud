// === js/systems/village-system.js ===
// SURVIVAL EXTRACTION UPDATE: Village hub management

// ============================================================================
// VILLAGE SYSTEM
// ============================================================================

const VillageSystem = {

    // State
    initialized: false,
    villageData: null,

    // Movement settings (continuous like dungeon)
    moveSpeed: 4.5,           // Tiles per second
    inputBuffer: { x: 0, y: 0 },
    keysHeld: { up: false, down: false, left: false, right: false },
    lastUpdateTime: 0,

    // Animation settings
    walkAnimSpeed: 8,         // Frames per second

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
                facingY: 1,
                // Animation properties (same as dungeon player)
                isMoving: false,
                currentFrame: 0,
                animTimer: 0,
                facing: 'down'
            };

            // Spawn NPCs
            this._spawnNPCs();
        }

        // Reset key state
        this.keysHeld = { up: false, down: false, left: false, right: false };
        this.lastUpdateTime = performance.now();

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
        // Remove any existing village listeners
        if (this._keyDownHandler) {
            window.removeEventListener('keydown', this._keyDownHandler);
        }
        if (this._keyUpHandler) {
            window.removeEventListener('keyup', this._keyUpHandler);
        }

        this._keyDownHandler = (e) => this._handleKeyDown(e);
        this._keyUpHandler = (e) => this._handleKeyUp(e);

        window.addEventListener('keydown', this._keyDownHandler);
        window.addEventListener('keyup', this._keyUpHandler);
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

        // Track held keys for continuous movement
        switch (e.key) {
            case 'w':
            case 'W':
            case 'ArrowUp':
                this.keysHeld.up = true;
                break;

            case 's':
            case 'S':
            case 'ArrowDown':
                this.keysHeld.down = true;
                break;

            case 'a':
            case 'A':
            case 'ArrowLeft':
                this.keysHeld.left = true;
                break;

            case 'd':
            case 'D':
            case 'ArrowRight':
                this.keysHeld.right = true;
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
     * Handle keyup events
     * @param {KeyboardEvent} e
     * @private
     */
    _handleKeyUp(e) {
        switch (e.key) {
            case 'w':
            case 'W':
            case 'ArrowUp':
                this.keysHeld.up = false;
                break;

            case 's':
            case 'S':
            case 'ArrowDown':
                this.keysHeld.down = false;
                break;

            case 'a':
            case 'A':
            case 'ArrowLeft':
                this.keysHeld.left = false;
                break;

            case 'd':
            case 'D':
            case 'ArrowRight':
                this.keysHeld.right = false;
                break;
        }
    },

    /**
     * Update movement and animation (called each frame)
     * @param {number} deltaTime - Time since last frame in ms
     */
    update(deltaTime) {
        if (!this.initialized || !villageState || !villageState.player) return;
        if (game.state !== 'village') return;

        const player = villageState.player;
        const dt = deltaTime / 1000;  // Convert to seconds

        // Calculate input direction
        let dx = 0, dy = 0;
        if (this.keysHeld.up) dy -= 1;
        if (this.keysHeld.down) dy += 1;
        if (this.keysHeld.left) dx -= 1;
        if (this.keysHeld.right) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }

        const hasInput = dx !== 0 || dy !== 0;

        // Update facing direction
        if (hasInput) {
            player.facingX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
            player.facingY = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
            player.facing = this._getFacingFromInput(dx, dy);
        }

        // Calculate movement
        if (hasInput) {
            const moveAmount = this.moveSpeed * dt;

            // Try to move
            const newX = player.displayX + dx * moveAmount;
            const newY = player.displayY + dy * moveAmount;

            // Check if new position is valid
            if (this._canMoveTo(newX, newY)) {
                player.displayX = newX;
                player.displayY = newY;
                player.isMoving = true;
            } else {
                // Try wall sliding - move on each axis separately
                if (dx !== 0 && this._canMoveTo(player.displayX + dx * moveAmount, player.displayY)) {
                    player.displayX += dx * moveAmount;
                    player.isMoving = true;
                } else if (dy !== 0 && this._canMoveTo(player.displayX, player.displayY + dy * moveAmount)) {
                    player.displayY += dy * moveAmount;
                    player.isMoving = true;
                } else {
                    player.isMoving = false;
                }
            }

            // Update logical position (grid-based for collision)
            player.x = Math.round(player.displayX);
            player.y = Math.round(player.displayY);

            // Check for chasm entrance
            if (VillageGenerator.isChasmEntrance(villageState.map, player.x, player.y)) {
                this._onChasmEntrance();
            }
        } else {
            player.isMoving = false;
        }

        // Update animation
        this._updateAnimation(player, dt);
    },

    /**
     * Get facing direction string from input
     * @private
     */
    _getFacingFromInput(dx, dy) {
        // Prioritize vertical for diagonal movement
        if (dy < 0) return 'up';
        if (dy > 0) return 'down';
        if (dx < 0) return 'left';
        if (dx > 0) return 'right';
        return 'down';
    },

    /**
     * Check if position is valid for movement
     * @private
     */
    _canMoveTo(x, y) {
        if (!villageState || !villageState.map) return false;

        // Check map bounds
        if (x < 0.3 || x >= VillageGenerator.WIDTH - 0.3 ||
            y < 0.3 || y >= VillageGenerator.HEIGHT - 0.3) {
            return false;
        }

        // Check collision at corners of player hitbox
        const hitboxSize = 0.35;
        const checkPoints = [
            { x: x - hitboxSize, y: y - hitboxSize },
            { x: x + hitboxSize, y: y - hitboxSize },
            { x: x - hitboxSize, y: y + hitboxSize },
            { x: x + hitboxSize, y: y + hitboxSize }
        ];

        for (const point of checkPoints) {
            const tileX = Math.floor(point.x);
            const tileY = Math.floor(point.y);
            const tile = villageState.map[tileY]?.[tileX];

            if (!tile || !tile.walkable) {
                return false;
            }
        }

        return true;
    },

    /**
     * Update player walking animation
     * @private
     */
    _updateAnimation(player, dt) {
        if (player.isMoving) {
            player.animTimer = (player.animTimer || 0) + dt;

            const frameDuration = 1 / this.walkAnimSpeed;
            if (player.animTimer >= frameDuration) {
                player.animTimer -= frameDuration;
                player.currentFrame = ((player.currentFrame || 0) + 1) % 20;  // 20 frames
            }
        } else {
            player.currentFrame = 0;
            player.animTimer = 0;
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

        // Calculate delta time
        const now = performance.now();
        const deltaTime = now - (this.lastUpdateTime || now);
        this.lastUpdateTime = now;

        // Update movement and animation
        this.update(deltaTime);

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
        if (this._keyDownHandler) {
            window.removeEventListener('keydown', this._keyDownHandler);
            this._keyDownHandler = null;
        }
        if (this._keyUpHandler) {
            window.removeEventListener('keyup', this._keyUpHandler);
            this._keyUpHandler = null;
        }

        // Reset key state
        this.keysHeld = { up: false, down: false, left: false, right: false };

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
