// ============================================================================
// NPC SYSTEM - Non-enemy entities for shift scenarios
// ============================================================================
// Handles NPCs like spirits, prisoners, guides that can be interacted with,
// followed, and escorted during shift scenarios.
// ============================================================================

const NPCSystem = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    config: {
        debugLogging: false,
        interactRange: 1.5,
        followDistance: 2,
        pathfindingInterval: 500  // ms between pathfinding updates
    },

    // ========================================================================
    // STATE
    // ========================================================================
    npcs: new Map(),             // npcId -> NPC object
    activeEscorts: new Map(),    // npcId -> escort state

    // ========================================================================
    // NPC TYPES
    // ========================================================================
    NPC_TYPES: {
        SPIRIT: 'spirit',
        PRISONER: 'prisoner',
        GUIDE: 'guide',
        MERCHANT: 'merchant',
        WOUNDED: 'wounded',
        GHOST: 'ghost'
    },

    // NPC configurations
    NPC_CONFIGS: {
        'spirit': {
            name: 'Lost Spirit',
            moveSpeed: 2,
            health: null,           // null = invulnerable
            canPhase: true,         // Can pass through walls
            glows: true,
            glowColor: '#88ccff',
            sprite: 'spirit',
            interactPrompt: 'Press F to commune',
            states: ['bound', 'following', 'guiding', 'freed']
        },
        'prisoner': {
            name: 'Prisoner',
            moveSpeed: 2.5,
            health: 50,
            canPhase: false,
            glows: false,
            sprite: 'prisoner',
            interactPrompt: 'Press F to free',
            states: ['bound', 'freed', 'following', 'rescued']
        },
        'guide': {
            name: 'Guide',
            moveSpeed: 3,
            health: 100,
            canPhase: false,
            glows: true,
            glowColor: '#ffdd88',
            sprite: 'guide',
            interactPrompt: 'Press F to follow',
            states: ['idle', 'guiding', 'waiting', 'arrived']
        },
        'wounded': {
            name: 'Wounded Adventurer',
            moveSpeed: 1.5,
            health: 30,
            canPhase: false,
            glows: false,
            sprite: 'wounded',
            interactPrompt: 'Press F to help',
            states: ['wounded', 'healing', 'following', 'rescued']
        },
        'ghost': {
            name: 'Vengeful Ghost',
            moveSpeed: 4,
            health: null,
            canPhase: true,
            glows: true,
            glowColor: '#aaddff',
            sprite: 'ghost',
            interactPrompt: 'Press F to appease',
            states: ['hostile', 'neutral', 'friendly', 'departed']
        }
    },

    // ========================================================================
    // CORE METHODS
    // ========================================================================

    /**
     * Spawn an NPC
     * @param {object} config - NPC configuration
     * @returns {string} - NPC ID
     */
    spawn(config) {
        const type = config.type || 'spirit';
        const defaults = this.NPC_CONFIGS[type] || this.NPC_CONFIGS['spirit'];

        const npc = {
            id: config.id || `npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,

            // Display
            name: config.name ?? defaults.name,
            sprite: config.sprite ?? defaults.sprite,

            // Position
            gridX: config.gridX ?? config.x ?? 0,
            gridY: config.gridY ?? config.y ?? 0,
            displayX: config.gridX ?? config.x ?? 0,
            displayY: config.gridY ?? config.y ?? 0,

            // Movement
            moveSpeed: config.moveSpeed ?? defaults.moveSpeed,
            isMoving: false,
            targetGridX: null,
            targetGridY: null,
            path: config.path ?? [],      // For guides with predetermined paths
            pathIndex: 0,
            canPhase: config.canPhase ?? defaults.canPhase,
            pathfindTimer: 0,

            // State
            state: config.initialState ?? defaults.states[0],
            validStates: defaults.states,
            health: config.health ?? defaults.health,
            maxHealth: config.health ?? defaults.health,

            // Interaction
            interactable: config.interactable ?? true,
            interactRange: config.interactRange ?? this.config.interactRange,
            interactPrompt: config.interactPrompt ?? defaults.interactPrompt,

            // Visual
            glows: config.glows ?? defaults.glows,
            glowColor: config.glowColor ?? defaults.glowColor,
            visible: true,
            facingDirection: 'down',
            animationState: 'idle',

            // Escort/Following
            isFollowing: false,
            followTarget: null,
            followDistance: config.followDistance ?? this.config.followDistance,

            // Callbacks
            onInteract: config.onInteract ?? null,
            onStateChange: config.onStateChange ?? null,
            onDeath: config.onDeath ?? null,
            onReachDestination: config.onReachDestination ?? null,
            onDamage: config.onDamage ?? null,

            // Dialogue
            dialogue: config.dialogue ?? [],
            currentDialogueIndex: 0
        };

        this.npcs.set(npc.id, npc);

        // Mark on map
        if (game.map[Math.floor(npc.gridY)]?.[Math.floor(npc.gridX)]) {
            game.map[Math.floor(npc.gridY)][Math.floor(npc.gridX)].npc = npc.id;
        }

        if (this.config.debugLogging) {
            console.log(`[NPC] Spawned ${type}: ${npc.id} at (${npc.gridX}, ${npc.gridY})`);
        }

        return npc.id;
    },

    /**
     * Remove an NPC
     * @param {string} npcId - The NPC to remove
     */
    remove(npcId) {
        const npc = this.npcs.get(npcId);
        if (!npc) return;

        // Clear from map
        const mapX = Math.floor(npc.gridX);
        const mapY = Math.floor(npc.gridY);
        if (game.map[mapY]?.[mapX]?.npc === npcId) {
            delete game.map[mapY][mapX].npc;
        }

        // Clear escort state
        this.activeEscorts.delete(npcId);

        this.npcs.delete(npcId);

        if (this.config.debugLogging) {
            console.log(`[NPC] Removed: ${npcId}`);
        }
    },

    /**
     * Get an NPC by ID
     * @param {string} npcId - The NPC ID
     * @returns {object|null}
     */
    get(npcId) {
        return this.npcs.get(npcId) || null;
    },

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    /**
     * Change NPC state
     * @param {string} npcId - The NPC ID
     * @param {string} newState - The new state
     */
    setState(npcId, newState) {
        const npc = this.npcs.get(npcId);
        if (!npc) return;

        if (!npc.validStates.includes(newState)) {
            console.warn(`[NPC] Invalid state "${newState}" for ${npcId}`);
            return;
        }

        const oldState = npc.state;
        npc.state = newState;

        // Handle state-specific behavior
        switch (newState) {
            case 'following':
                npc.isFollowing = true;
                npc.followTarget = game.player;
                break;
            case 'guiding':
                npc.isFollowing = false;
                break;
            case 'freed':
            case 'rescued':
            case 'departed':
                npc.interactable = false;
                break;
        }

        // Callback
        if (npc.onStateChange) {
            npc.onStateChange(npc, oldState, newState);
        }

        if (this.config.debugLogging) {
            console.log(`[NPC] ${npcId} state: ${oldState} -> ${newState}`);
        }
    },

    // ========================================================================
    // INTERACTION
    // ========================================================================

    /**
     * Interact with an NPC
     * @param {string} npcId - The NPC ID
     * @returns {boolean} - Success
     */
    interact(npcId) {
        const npc = this.npcs.get(npcId);
        if (!npc || !npc.interactable) return false;

        // Check range
        if (game.player) {
            const dist = Math.sqrt(
                (game.player.gridX - npc.gridX) ** 2 +
                (game.player.gridY - npc.gridY) ** 2
            );
            if (dist > npc.interactRange) return false;
        }

        // Custom callback
        if (npc.onInteract) {
            npc.onInteract(npc, game.player);
        }

        // Show dialogue if available
        if (npc.dialogue.length > 0) {
            const line = npc.dialogue[npc.currentDialogueIndex];
            addMessage(`${npc.name}: "${line}"`);
            npc.currentDialogueIndex = (npc.currentDialogueIndex + 1) % npc.dialogue.length;
        }

        if (this.config.debugLogging) {
            console.log(`[NPC] Interacted with: ${npcId}`);
        }

        return true;
    },

    /**
     * Get interactable NPC near player
     * @returns {object|null}
     */
    getNearPlayer() {
        if (!game.player) return null;

        const px = game.player.gridX;
        const py = game.player.gridY;

        for (const [id, npc] of this.npcs) {
            if (!npc.interactable || !npc.visible) continue;

            const dist = Math.sqrt((px - npc.gridX) ** 2 + (py - npc.gridY) ** 2);
            if (dist <= npc.interactRange) {
                return npc;
            }
        }

        return null;
    },

    // ========================================================================
    // MOVEMENT & PATHFINDING
    // ========================================================================

    /**
     * Start guiding along a path
     * @param {string} npcId - The NPC ID
     * @param {Array} path - Array of {x, y} positions
     */
    startGuiding(npcId, path) {
        const npc = this.npcs.get(npcId);
        if (!npc) return;

        npc.path = path;
        npc.pathIndex = 0;
        this.setState(npcId, 'guiding');
    },

    /**
     * Start following the player
     * @param {string} npcId - The NPC ID
     */
    startFollowing(npcId) {
        const npc = this.npcs.get(npcId);
        if (!npc) return;

        npc.followTarget = game.player;
        this.setState(npcId, 'following');
    },

    /**
     * Stop following
     * @param {string} npcId - The NPC ID
     */
    stopFollowing(npcId) {
        const npc = this.npcs.get(npcId);
        if (!npc) return;

        npc.isFollowing = false;
        npc.followTarget = null;
        npc.isMoving = false;
    },

    /**
     * Move NPC toward target position
     * @param {object} npc - The NPC
     * @param {number} targetX - Target grid X
     * @param {number} targetY - Target grid Y
     * @param {number} dt - Delta time
     */
    moveToward(npc, targetX, targetY, dt) {
        const dx = targetX - npc.gridX;
        const dy = targetY - npc.gridY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.1) {
            npc.isMoving = false;
            return;
        }

        const speed = npc.moveSpeed * (dt / 1000);
        const moveX = (dx / dist) * Math.min(speed, dist);
        const moveY = (dy / dist) * Math.min(speed, dist);

        // Check collision (unless can phase)
        const newX = npc.gridX + moveX;
        const newY = npc.gridY + moveY;

        if (npc.canPhase || this.canMoveTo(newX, newY)) {
            // Clear old map position
            const oldMapX = Math.floor(npc.gridX);
            const oldMapY = Math.floor(npc.gridY);
            if (game.map[oldMapY]?.[oldMapX]?.npc === npc.id) {
                delete game.map[oldMapY][oldMapX].npc;
            }

            // Update position
            npc.gridX = newX;
            npc.gridY = newY;
            npc.displayX = newX;
            npc.displayY = newY;
            npc.isMoving = true;

            // Update facing
            if (Math.abs(dx) > Math.abs(dy)) {
                npc.facingDirection = dx > 0 ? 'right' : 'left';
            } else {
                npc.facingDirection = dy > 0 ? 'down' : 'up';
            }

            // Set new map position
            const newMapX = Math.floor(newX);
            const newMapY = Math.floor(newY);
            if (game.map[newMapY]?.[newMapX]) {
                game.map[newMapY][newMapX].npc = npc.id;
            }
        }
    },

    /**
     * Check if NPC can move to position
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {boolean}
     */
    canMoveTo(x, y) {
        const mapX = Math.floor(x);
        const mapY = Math.floor(y);

        if (mapX < 0 || mapX >= GRID_WIDTH || mapY < 0 || mapY >= GRID_HEIGHT) {
            return false;
        }

        const tile = game.map[mapY]?.[mapX];
        if (!tile) return false;

        return tile.type === 'floor' || tile.type === 'doorway' || tile.type === 'exit';
    },

    /**
     * Find path from NPC to target
     * @param {object} npc - The NPC
     * @param {number} targetX - Target grid X
     * @param {number} targetY - Target grid Y
     * @returns {Array} - Path array or empty
     */
    findPath(npc, targetX, targetY) {
        // Use existing pathfinding if available
        if (typeof findPath === 'function') {
            return findPath(
                Math.floor(npc.gridX),
                Math.floor(npc.gridY),
                Math.floor(targetX),
                Math.floor(targetY),
                game.map,
                npc.canPhase
            );
        }

        // Simple direct path fallback
        return [{ x: targetX, y: targetY }];
    },

    // ========================================================================
    // DAMAGE & DEATH
    // ========================================================================

    /**
     * Damage an NPC
     * @param {string} npcId - The NPC ID
     * @param {number} amount - Damage amount
     * @param {object} source - Damage source
     * @returns {boolean} - True if NPC died
     */
    damage(npcId, amount, source = null) {
        const npc = this.npcs.get(npcId);
        if (!npc || npc.health === null) return false;

        npc.health -= amount;

        // Callback
        if (npc.onDamage) {
            npc.onDamage(npc, amount, source);
        }

        if (npc.health <= 0) {
            this.kill(npcId);
            return true;
        }

        return false;
    },

    /**
     * Kill an NPC
     * @param {string} npcId - The NPC ID
     */
    kill(npcId) {
        const npc = this.npcs.get(npcId);
        if (!npc) return;

        npc.state = 'dead';
        npc.visible = false;
        npc.interactable = false;

        // Callback
        if (npc.onDeath) {
            npc.onDeath(npc);
        }

        addMessage(`${npc.name} has died!`);

        if (this.config.debugLogging) {
            console.log(`[NPC] ${npcId} died`);
        }
    },

    /**
     * Heal an NPC
     * @param {string} npcId - The NPC ID
     * @param {number} amount - Heal amount
     */
    heal(npcId, amount) {
        const npc = this.npcs.get(npcId);
        if (!npc || npc.health === null) return;

        npc.health = Math.min(npc.maxHealth, npc.health + amount);
    },

    // ========================================================================
    // UPDATE & LIFECYCLE
    // ========================================================================

    /**
     * Update all NPCs
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        this.npcs.forEach((npc, id) => {
            if (npc.state === 'dead') return;

            // Update pathfinding timer
            npc.pathfindTimer += dt;

            // Handle following behavior
            if (npc.isFollowing && npc.followTarget) {
                const target = npc.followTarget;
                const dist = Math.sqrt(
                    (npc.gridX - target.gridX) ** 2 +
                    (npc.gridY - target.gridY) ** 2
                );

                // Only move if far enough from target
                if (dist > npc.followDistance) {
                    // Pathfind periodically
                    if (npc.pathfindTimer >= this.config.pathfindingInterval) {
                        npc.pathfindTimer = 0;
                        npc.path = this.findPath(npc, target.gridX, target.gridY);
                        npc.pathIndex = 0;
                    }

                    // Follow path
                    if (npc.path && npc.path.length > 0 && npc.pathIndex < npc.path.length) {
                        const waypoint = npc.path[npc.pathIndex];
                        this.moveToward(npc, waypoint.x, waypoint.y, dt);

                        // Check if reached waypoint
                        const wpDist = Math.sqrt(
                            (npc.gridX - waypoint.x) ** 2 +
                            (npc.gridY - waypoint.y) ** 2
                        );
                        if (wpDist < 0.3) {
                            npc.pathIndex++;
                        }
                    } else {
                        // Direct movement if no path
                        this.moveToward(npc, target.gridX, target.gridY, dt);
                    }
                } else {
                    npc.isMoving = false;
                }
            }

            // Handle guiding behavior
            if (npc.state === 'guiding' && npc.path && npc.path.length > 0) {
                if (npc.pathIndex < npc.path.length) {
                    const waypoint = npc.path[npc.pathIndex];
                    this.moveToward(npc, waypoint.x, waypoint.y, dt);

                    // Check if reached waypoint
                    const wpDist = Math.sqrt(
                        (npc.gridX - waypoint.x) ** 2 +
                        (npc.gridY - waypoint.y) ** 2
                    );
                    if (wpDist < 0.3) {
                        npc.pathIndex++;

                        // Reveal path for spirit guides
                        if (npc.canPhase) {
                            this.revealTile(npc, Math.floor(waypoint.x), Math.floor(waypoint.y));
                        }
                    }
                } else {
                    // Reached destination
                    npc.isMoving = false;
                    if (npc.onReachDestination) {
                        npc.onReachDestination(npc);
                    }
                    this.setState(id, 'arrived');
                }
            }

            // Update animation state
            npc.animationState = npc.isMoving ? 'walking' : 'idle';
        });
    },

    /**
     * Reveal a tile (for spirit guides passing through walls)
     * @param {object} npc - The NPC
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     */
    revealTile(npc, x, y) {
        const tile = game.map[y]?.[x];
        if (tile?.type === 'wall' && npc.canPhase) {
            tile.spiritRevealed = true;
            tile.passable = true;
            // Could trigger visual effect here
        }
    },

    /**
     * Cleanup all NPCs
     */
    cleanup() {
        // Clear map markers
        this.npcs.forEach(npc => {
            const mapX = Math.floor(npc.gridX);
            const mapY = Math.floor(npc.gridY);
            if (game.map[mapY]?.[mapX]?.npc === npc.id) {
                delete game.map[mapY][mapX].npc;
            }
        });

        this.npcs.clear();
        this.activeEscorts.clear();

        if (this.config.debugLogging) {
            console.log('[NPC] System cleaned up');
        }
    },

    // ========================================================================
    // QUERY METHODS
    // ========================================================================

    /**
     * Get all NPCs
     * @returns {Array}
     */
    getAll() {
        return Array.from(this.npcs.values());
    },

    /**
     * Get NPCs by type
     * @param {string} type - NPC type
     * @returns {Array}
     */
    getByType(type) {
        const result = [];
        this.npcs.forEach(npc => {
            if (npc.type === type) result.push(npc);
        });
        return result;
    },

    /**
     * Get NPCs by state
     * @param {string} state - NPC state
     * @returns {Array}
     */
    getByState(state) {
        const result = [];
        this.npcs.forEach(npc => {
            if (npc.state === state) result.push(npc);
        });
        return result;
    },

    /**
     * Get NPC at position
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {object|null}
     */
    getAtPosition(x, y) {
        for (const [id, npc] of this.npcs) {
            const dist = Math.sqrt((npc.gridX - x) ** 2 + (npc.gridY - y) ** 2);
            if (dist < 1) return npc;
        }
        return null;
    },

    // ========================================================================
    // DEBUG
    // ========================================================================

    getStatus() {
        const byType = {};
        const byState = {};

        this.npcs.forEach(npc => {
            byType[npc.type] = (byType[npc.type] || 0) + 1;
            byState[npc.state] = (byState[npc.state] || 0) + 1;
        });

        return {
            total: this.npcs.size,
            byType,
            byState,
            activeEscorts: this.activeEscorts.size
        };
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const NPCSystemDef = {
    name: 'npc-system',

    init() {
        if (NPCSystem.config.debugLogging) {
            console.log('[NPC] System initialized');
        }
    },

    update(dt) {
        NPCSystem.update(dt);
    },

    cleanup() {
        NPCSystem.cleanup();
    }
};

// Register with SystemManager (priority 41 - before enemy AI)
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('npc-system', NPCSystemDef, 41);
} else {
    console.warn('[NPC] SystemManager not found - running standalone');
}

// ============================================================================
// EXPORTS
// ============================================================================
window.NPCSystem = NPCSystem;

console.log('✅ NPC System loaded');
