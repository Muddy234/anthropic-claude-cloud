// ============================================================================
// NPC SYSTEM - Non-enemy entities with quests, behaviors, and interactions
// ============================================================================
// Comprehensive NPC system with:
// - Quest giving and tracking
// - Modular behavior system
// - Advanced movement patterns
// - Dialogue trees
// - State machines
// ============================================================================

const NPCSystem = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    config: {
        debugLogging: false,
        interactRange: 1.5,
        followDistance: 2,
        pathfindingInterval: 500,
        behaviorUpdateInterval: 100
    },

    // ========================================================================
    // STATE
    // ========================================================================
    npcs: new Map(),             // npcId -> NPC object
    activeEscorts: new Map(),    // npcId -> escort state
    quests: new Map(),           // questId -> quest object
    dialogueActive: null,        // Currently active dialogue

    // ========================================================================
    // NPC TYPES
    // ========================================================================
    NPC_TYPES: {
        SPIRIT: 'spirit',
        PRISONER: 'prisoner',
        GUIDE: 'guide',
        MERCHANT: 'merchant',
        WOUNDED: 'wounded',
        GHOST: 'ghost',
        QUEST_GIVER: 'quest_giver',
        VILLAGER: 'villager'
    },

    // NPC base configurations
    NPC_CONFIGS: {
        'spirit': {
            name: 'Lost Spirit',
            moveSpeed: 2,
            health: null,
            canPhase: true,
            glows: true,
            glowColor: '#88ccff',
            sprite: 'spirit',
            interactPrompt: 'Press F to commune',
            validStates: ['bound', 'following', 'guiding', 'freed'],
            defaultBehavior: 'idle'
        },
        'prisoner': {
            name: 'Prisoner',
            moveSpeed: 2.5,
            health: 50,
            canPhase: false,
            glows: false,
            sprite: 'prisoner',
            interactPrompt: 'Press F to free',
            validStates: ['bound', 'freed', 'following', 'rescued'],
            defaultBehavior: 'idle'
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
            validStates: ['idle', 'guiding', 'waiting', 'arrived'],
            defaultBehavior: 'wait_for_player'
        },
        'quest_giver': {
            name: 'Quest Giver',
            moveSpeed: 1,
            health: null,
            canPhase: false,
            glows: false,
            sprite: 'npc',
            interactPrompt: 'Press F to talk',
            validStates: ['idle', 'talking', 'quest_active', 'quest_complete'],
            defaultBehavior: 'stationary'
        },
        'merchant': {
            name: 'Merchant',
            moveSpeed: 0,
            health: null,
            canPhase: false,
            glows: false,
            sprite: 'merchant',
            interactPrompt: 'Press F to trade',
            validStates: ['idle', 'trading'],
            defaultBehavior: 'stationary'
        },
        'wounded': {
            name: 'Wounded Adventurer',
            moveSpeed: 1.5,
            health: 30,
            canPhase: false,
            glows: false,
            sprite: 'wounded',
            interactPrompt: 'Press F to help',
            validStates: ['wounded', 'healing', 'following', 'rescued'],
            defaultBehavior: 'cower'
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
            validStates: ['hostile', 'neutral', 'friendly', 'departed'],
            defaultBehavior: 'haunt'
        },
        'villager': {
            name: 'Villager',
            moveSpeed: 2,
            health: 20,
            canPhase: false,
            glows: false,
            sprite: 'villager',
            interactPrompt: 'Press F to talk',
            validStates: ['idle', 'talking', 'fleeing', 'dead'],
            defaultBehavior: 'wander'
        }
    },

    // ========================================================================
    // BEHAVIOR DEFINITIONS
    // ========================================================================
    BEHAVIORS: {
        // Stationary - doesn't move at all
        'stationary': {
            update: (npc, dt) => { npc.isMoving = false; }
        },

        // Idle - stands still, occasionally looks around
        'idle': {
            update: (npc, dt) => {
                npc.isMoving = false;
                npc.behaviorTimer = (npc.behaviorTimer || 0) + dt;
                if (npc.behaviorTimer > 3000) {
                    npc.behaviorTimer = 0;
                    const dirs = ['up', 'down', 'left', 'right'];
                    npc.facingDirection = dirs[Math.floor(Math.random() * 4)];
                }
            }
        },

        // Wander - moves randomly within an area
        'wander': {
            init: (npc) => {
                npc.wanderCenter = { x: npc.gridX, y: npc.gridY };
                npc.wanderRadius = npc.wanderRadius || 5;
                npc.wanderTarget = null;
                npc.wanderPauseTimer = 0;
            },
            update: (npc, dt) => {
                npc.wanderPauseTimer -= dt;

                if (npc.wanderPauseTimer <= 0 && !npc.wanderTarget) {
                    // Pick new target
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * npc.wanderRadius;
                    npc.wanderTarget = {
                        x: npc.wanderCenter.x + Math.cos(angle) * dist,
                        y: npc.wanderCenter.y + Math.sin(angle) * dist
                    };
                }

                if (npc.wanderTarget) {
                    const arrived = NPCSystem.moveToward(npc, npc.wanderTarget.x, npc.wanderTarget.y, dt);
                    if (arrived || !NPCSystem.canMoveTo(npc.wanderTarget.x, npc.wanderTarget.y)) {
                        npc.wanderTarget = null;
                        npc.wanderPauseTimer = 1000 + Math.random() * 3000;
                        npc.isMoving = false;
                    }
                }
            }
        },

        // Patrol - follows a set path repeatedly
        'patrol': {
            init: (npc) => {
                npc.patrolPath = npc.patrolPath || [];
                npc.patrolIndex = 0;
                npc.patrolReverse = false;
                npc.patrolPauseTimer = 0;
            },
            update: (npc, dt) => {
                if (!npc.patrolPath || npc.patrolPath.length === 0) return;

                npc.patrolPauseTimer -= dt;
                if (npc.patrolPauseTimer > 0) return;

                const target = npc.patrolPath[npc.patrolIndex];
                const arrived = NPCSystem.moveToward(npc, target.x, target.y, dt);

                if (arrived) {
                    npc.patrolPauseTimer = target.pauseTime || 500;

                    // Move to next point
                    if (npc.patrolReverse) {
                        npc.patrolIndex--;
                        if (npc.patrolIndex < 0) {
                            npc.patrolIndex = 1;
                            npc.patrolReverse = false;
                        }
                    } else {
                        npc.patrolIndex++;
                        if (npc.patrolIndex >= npc.patrolPath.length) {
                            npc.patrolIndex = npc.patrolPath.length - 2;
                            npc.patrolReverse = true;
                        }
                    }
                }
            }
        },

        // Follow player - follows at a distance
        'follow_player': {
            update: (npc, dt) => {
                if (!game.player) return;

                const dist = Math.sqrt(
                    (npc.gridX - game.player.gridX) ** 2 +
                    (npc.gridY - game.player.gridY) ** 2
                );

                if (dist > npc.followDistance) {
                    NPCSystem.moveToward(npc, game.player.gridX, game.player.gridY, dt);
                } else {
                    npc.isMoving = false;
                }
            }
        },

        // Wait for player - stays put until player is nearby, then follows
        'wait_for_player': {
            update: (npc, dt) => {
                if (!game.player) return;

                const dist = Math.sqrt(
                    (npc.gridX - game.player.gridX) ** 2 +
                    (npc.gridY - game.player.gridY) ** 2
                );

                if (dist < 3) {
                    // Player is close, start following
                    NPCSystem.setBehavior(npc.id, 'follow_player');
                } else {
                    npc.isMoving = false;
                    // Face toward player
                    const dx = game.player.gridX - npc.gridX;
                    const dy = game.player.gridY - npc.gridY;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        npc.facingDirection = dx > 0 ? 'right' : 'left';
                    } else {
                        npc.facingDirection = dy > 0 ? 'down' : 'up';
                    }
                }
            }
        },

        // Flee - runs away from threats
        'flee': {
            init: (npc) => {
                npc.fleeFrom = npc.fleeFrom || null;
                npc.fleeDistance = npc.fleeDistance || 8;
            },
            update: (npc, dt) => {
                let threatX = npc.fleeFrom?.gridX ?? game.player?.gridX;
                let threatY = npc.fleeFrom?.gridY ?? game.player?.gridY;

                if (threatX === undefined) return;

                const dist = Math.sqrt(
                    (npc.gridX - threatX) ** 2 + (npc.gridY - threatY) ** 2
                );

                if (dist < npc.fleeDistance) {
                    // Run away
                    const dx = npc.gridX - threatX;
                    const dy = npc.gridY - threatY;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    const fleeX = npc.gridX + (dx / len) * 3;
                    const fleeY = npc.gridY + (dy / len) * 3;
                    NPCSystem.moveToward(npc, fleeX, fleeY, dt);
                } else {
                    npc.isMoving = false;
                    // Return to idle after fleeing far enough
                    NPCSystem.setBehavior(npc.id, 'idle');
                }
            }
        },

        // Cower - stays still, trembles
        'cower': {
            update: (npc, dt) => {
                npc.isMoving = false;
                npc.animationState = 'cowering';
            }
        },

        // Haunt - ghostly behavior, teleports around
        'haunt': {
            init: (npc) => {
                npc.hauntTimer = 0;
                npc.hauntInterval = 3000 + Math.random() * 5000;
            },
            update: (npc, dt) => {
                npc.hauntTimer += dt;

                if (npc.hauntTimer >= npc.hauntInterval) {
                    npc.hauntTimer = 0;
                    npc.hauntInterval = 3000 + Math.random() * 5000;

                    // Teleport to random nearby location
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 3 + Math.random() * 5;
                    const newX = npc.gridX + Math.cos(angle) * dist;
                    const newY = npc.gridY + Math.sin(angle) * dist;

                    if (NPCSystem.canMoveTo(newX, newY) || npc.canPhase) {
                        NPCSystem.teleport(npc.id, newX, newY);
                    }
                }
            }
        },

        // Guide to destination - leads player along a path
        'guide_to_destination': {
            init: (npc) => {
                npc.guidePath = npc.guidePath || [];
                npc.guideIndex = 0;
                npc.waitingForPlayer = false;
            },
            update: (npc, dt) => {
                if (!npc.guidePath || npc.guidePath.length === 0) return;
                if (!game.player) return;

                // Check if player is close enough
                const playerDist = Math.sqrt(
                    (npc.gridX - game.player.gridX) ** 2 +
                    (npc.gridY - game.player.gridY) ** 2
                );

                if (playerDist > 5) {
                    // Wait for player to catch up
                    npc.waitingForPlayer = true;
                    npc.isMoving = false;
                    return;
                }

                npc.waitingForPlayer = false;

                // Move toward next waypoint
                const target = npc.guidePath[npc.guideIndex];
                const arrived = NPCSystem.moveToward(npc, target.x, target.y, dt);

                if (arrived) {
                    npc.guideIndex++;
                    if (npc.guideIndex >= npc.guidePath.length) {
                        // Reached destination
                        if (npc.onReachDestination) {
                            npc.onReachDestination(npc);
                        }
                        NPCSystem.setBehavior(npc.id, 'idle');
                    }
                }
            }
        }
    },

    // ========================================================================
    // QUEST SYSTEM
    // ========================================================================

    QUEST_STATES: {
        UNAVAILABLE: 'unavailable',    // Prerequisites not met
        AVAILABLE: 'available',        // Can be accepted
        ACTIVE: 'active',              // In progress
        READY: 'ready',                // Objectives complete, return to NPC
        COMPLETE: 'complete',          // Turned in
        FAILED: 'failed'               // Failed
    },

    /**
     * Define a quest for an NPC
     * @param {object} questDef - Quest definition
     * @returns {string} - Quest ID
     */
    defineQuest(questDef) {
        const quest = {
            id: questDef.id || `quest_${Date.now()}`,
            npcId: questDef.npcId,
            name: questDef.name || 'Unnamed Quest',
            description: questDef.description || '',

            // State
            state: this.QUEST_STATES.UNAVAILABLE,

            // Prerequisites
            prerequisites: questDef.prerequisites || {
                quests: [],          // Quest IDs that must be complete
                items: [],           // Items player must have
                level: 1,            // Minimum player level
                custom: null         // Custom check function
            },

            // Objectives
            objectives: (questDef.objectives || []).map(obj => ({
                type: obj.type,      // 'kill', 'collect', 'deliver', 'escort', 'explore', 'interact', 'custom'
                target: obj.target,  // Target ID or type
                required: obj.required || 1,
                current: 0,
                description: obj.description || '',
                optional: obj.optional || false
            })),

            // Rewards
            rewards: questDef.rewards || {
                gold: 0,
                xp: 0,
                items: [],
                custom: null         // Custom reward function
            },

            // Dialogue
            dialogue: {
                available: questDef.dialogue?.available || ["I have a task for you."],
                active: questDef.dialogue?.active || ["How goes your progress?"],
                ready: questDef.dialogue?.ready || ["Excellent work!"],
                complete: questDef.dialogue?.complete || ["Thank you for your help."]
            },

            // Callbacks
            onAccept: questDef.onAccept || null,
            onProgress: questDef.onProgress || null,
            onComplete: questDef.onComplete || null,
            onFail: questDef.onFail || null,

            // Flags
            repeatable: questDef.repeatable || false,
            timeLimit: questDef.timeLimit || null,  // ms, null = no limit
            timer: 0
        };

        this.quests.set(quest.id, quest);

        // Link to NPC
        const npc = this.npcs.get(quest.npcId);
        if (npc) {
            npc.quests = npc.quests || [];
            npc.quests.push(quest.id);
        }

        if (this.config.debugLogging) {
            console.log(`[NPC] Defined quest: ${quest.id} for NPC ${quest.npcId}`);
        }

        return quest.id;
    },

    /**
     * Check and update quest availability
     * @param {string} questId - Quest ID
     */
    checkQuestAvailability(questId) {
        const quest = this.quests.get(questId);
        if (!quest) return;

        if (quest.state !== this.QUEST_STATES.UNAVAILABLE &&
            quest.state !== this.QUEST_STATES.COMPLETE) return;

        const prereqs = quest.prerequisites;

        // Check quest prerequisites
        if (prereqs.quests && prereqs.quests.length > 0) {
            for (const reqQuestId of prereqs.quests) {
                const reqQuest = this.quests.get(reqQuestId);
                if (!reqQuest || reqQuest.state !== this.QUEST_STATES.COMPLETE) {
                    return; // Prerequisite not met
                }
            }
        }

        // Check item prerequisites
        if (prereqs.items && prereqs.items.length > 0) {
            for (const itemId of prereqs.items) {
                const hasItem = game.player?.inventory?.some(i => i.name === itemId);
                if (!hasItem) return;
            }
        }

        // Check level
        if (prereqs.level && game.player?.level < prereqs.level) {
            return;
        }

        // Check custom
        if (prereqs.custom && !prereqs.custom(quest, game.player)) {
            return;
        }

        // All prerequisites met
        quest.state = this.QUEST_STATES.AVAILABLE;
    },

    /**
     * Accept a quest
     * @param {string} questId - Quest ID
     * @returns {boolean} - Success
     */
    acceptQuest(questId) {
        const quest = this.quests.get(questId);
        if (!quest || quest.state !== this.QUEST_STATES.AVAILABLE) return false;

        quest.state = this.QUEST_STATES.ACTIVE;
        quest.timer = 0;

        // Reset objectives
        quest.objectives.forEach(obj => obj.current = 0);

        if (quest.onAccept) {
            quest.onAccept(quest);
        }

        addMessage(`Quest accepted: ${quest.name}`);

        if (this.config.debugLogging) {
            console.log(`[NPC] Quest accepted: ${questId}`);
        }

        return true;
    },

    /**
     * Update quest progress
     * @param {string} questId - Quest ID
     * @param {string} objectiveType - Type of objective
     * @param {string} target - Target ID/type
     * @param {number} amount - Progress amount
     */
    updateQuestProgress(questId, objectiveType, target, amount = 1) {
        const quest = this.quests.get(questId);
        if (!quest || quest.state !== this.QUEST_STATES.ACTIVE) return;

        let updated = false;
        for (const obj of quest.objectives) {
            if (obj.type === objectiveType && obj.target === target && obj.current < obj.required) {
                obj.current = Math.min(obj.required, obj.current + amount);
                updated = true;

                addMessage(`Quest progress: ${obj.description} (${obj.current}/${obj.required})`);
            }
        }

        if (updated && quest.onProgress) {
            quest.onProgress(quest);
        }

        // Check if all required objectives complete
        this.checkQuestCompletion(questId);
    },

    /**
     * Update all active quests for a global event
     * @param {string} objectiveType - Type of objective
     * @param {string} target - Target ID/type
     * @param {number} amount - Progress amount
     */
    updateAllQuests(objectiveType, target, amount = 1) {
        this.quests.forEach((quest, questId) => {
            if (quest.state === this.QUEST_STATES.ACTIVE) {
                this.updateQuestProgress(questId, objectiveType, target, amount);
            }
        });
    },

    /**
     * Check if quest objectives are complete
     * @param {string} questId - Quest ID
     */
    checkQuestCompletion(questId) {
        const quest = this.quests.get(questId);
        if (!quest || quest.state !== this.QUEST_STATES.ACTIVE) return;

        const allComplete = quest.objectives
            .filter(obj => !obj.optional)
            .every(obj => obj.current >= obj.required);

        if (allComplete) {
            quest.state = this.QUEST_STATES.READY;
            addMessage(`Quest ready to turn in: ${quest.name}`);
        }
    },

    /**
     * Turn in a completed quest
     * @param {string} questId - Quest ID
     * @returns {boolean} - Success
     */
    turnInQuest(questId) {
        const quest = this.quests.get(questId);
        if (!quest || quest.state !== this.QUEST_STATES.READY) return false;

        // Grant rewards
        const rewards = quest.rewards;
        if (rewards.gold) {
            game.gold = (game.gold || 0) + rewards.gold;
            addMessage(`Received ${rewards.gold} gold`);
        }

        if (rewards.xp && game.player) {
            // Apply XP (implement based on your leveling system)
        }

        if (rewards.items && game.player?.inventory) {
            rewards.items.forEach(item => {
                game.player.inventory.push(item);
                addMessage(`Received ${item.name}`);
            });
        }

        if (rewards.custom) {
            rewards.custom(quest, game.player);
        }

        quest.state = this.QUEST_STATES.COMPLETE;

        if (quest.onComplete) {
            quest.onComplete(quest);
        }

        addMessage(`Quest complete: ${quest.name}`);

        // Check for newly available quests
        this.quests.forEach((q, qId) => this.checkQuestAvailability(qId));

        return true;
    },

    /**
     * Fail a quest
     * @param {string} questId - Quest ID
     */
    failQuest(questId) {
        const quest = this.quests.get(questId);
        if (!quest || quest.state !== this.QUEST_STATES.ACTIVE) return;

        quest.state = this.QUEST_STATES.FAILED;

        if (quest.onFail) {
            quest.onFail(quest);
        }

        addMessage(`Quest failed: ${quest.name}`);
    },

    /**
     * Get quest state info for UI
     * @param {string} questId - Quest ID
     * @returns {object}
     */
    getQuestInfo(questId) {
        const quest = this.quests.get(questId);
        if (!quest) return null;

        return {
            id: quest.id,
            name: quest.name,
            description: quest.description,
            state: quest.state,
            objectives: quest.objectives.map(obj => ({
                description: obj.description,
                current: obj.current,
                required: obj.required,
                complete: obj.current >= obj.required,
                optional: obj.optional
            })),
            rewards: quest.rewards,
            timeRemaining: quest.timeLimit ? Math.max(0, quest.timeLimit - quest.timer) : null
        };
    },

    /**
     * Get all active quests
     * @returns {Array}
     */
    getActiveQuests() {
        const active = [];
        this.quests.forEach(quest => {
            if (quest.state === this.QUEST_STATES.ACTIVE ||
                quest.state === this.QUEST_STATES.READY) {
                active.push(this.getQuestInfo(quest.id));
            }
        });
        return active;
    },

    // ========================================================================
    // DIALOGUE SYSTEM
    // ========================================================================

    /**
     * Get appropriate dialogue for NPC based on quest state
     * @param {string} npcId - NPC ID
     * @returns {Array} - Dialogue lines
     */
    getDialogueForNPC(npcId) {
        const npc = this.npcs.get(npcId);
        if (!npc) return [];

        // Check for quest-based dialogue
        if (npc.quests && npc.quests.length > 0) {
            for (const questId of npc.quests) {
                const quest = this.quests.get(questId);
                if (!quest) continue;

                switch (quest.state) {
                    case this.QUEST_STATES.AVAILABLE:
                        return quest.dialogue.available;
                    case this.QUEST_STATES.ACTIVE:
                        return quest.dialogue.active;
                    case this.QUEST_STATES.READY:
                        return quest.dialogue.ready;
                    case this.QUEST_STATES.COMPLETE:
                        if (npc.quests.indexOf(questId) === npc.quests.length - 1) {
                            return quest.dialogue.complete;
                        }
                        break;
                }
            }
        }

        // Default dialogue
        return npc.dialogue || [];
    },

    // ========================================================================
    // CORE NPC METHODS
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
            canPhase: config.canPhase ?? defaults.canPhase,
            pathfindTimer: 0,
            followDistance: config.followDistance ?? this.config.followDistance,

            // State
            state: config.initialState ?? defaults.validStates[0],
            validStates: defaults.validStates,
            health: config.health ?? defaults.health,
            maxHealth: config.health ?? defaults.health,

            // Behavior
            behavior: config.behavior ?? defaults.defaultBehavior,
            behaviorTimer: 0,
            previousBehavior: null,

            // Behavior-specific data
            wanderRadius: config.wanderRadius ?? 5,
            patrolPath: config.patrolPath ?? [],
            guidePath: config.guidePath ?? [],
            fleeDistance: config.fleeDistance ?? 8,

            // Interaction
            interactable: config.interactable ?? true,
            interactRange: config.interactRange ?? this.config.interactRange,
            interactPrompt: config.interactPrompt ?? defaults.interactPrompt,

            // Visual
            glows: config.glows ?? defaults.glows,
            glowColor: config.glowColor ?? defaults.glowColor,
            visible: true,
            facingDirection: config.facingDirection ?? 'down',
            animationState: 'idle',

            // Quests
            quests: config.quests ?? [],

            // Dialogue
            dialogue: config.dialogue ?? [],
            currentDialogueIndex: 0,

            // Callbacks
            onInteract: config.onInteract ?? null,
            onStateChange: config.onStateChange ?? null,
            onDeath: config.onDeath ?? null,
            onReachDestination: config.onReachDestination ?? null,
            onDamage: config.onDamage ?? null,

            // Combat (for hostile NPCs)
            hostile: config.hostile ?? false,
            damage: config.damage ?? 5,
            attackRange: config.attackRange ?? 1,
            attackCooldown: 0
        };

        this.npcs.set(npc.id, npc);

        // Initialize behavior
        const behaviorDef = this.BEHAVIORS[npc.behavior];
        if (behaviorDef?.init) {
            behaviorDef.init(npc);
        }

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
    // BEHAVIOR MANAGEMENT
    // ========================================================================

    /**
     * Set NPC behavior
     * @param {string} npcId - The NPC ID
     * @param {string} behaviorId - The behavior ID
     * @param {object} params - Optional behavior parameters
     */
    setBehavior(npcId, behaviorId, params = {}) {
        const npc = this.npcs.get(npcId);
        if (!npc) return;

        const behaviorDef = this.BEHAVIORS[behaviorId];
        if (!behaviorDef) {
            console.warn(`[NPC] Unknown behavior: ${behaviorId}`);
            return;
        }

        npc.previousBehavior = npc.behavior;
        npc.behavior = behaviorId;
        npc.behaviorTimer = 0;

        // Apply parameters
        Object.assign(npc, params);

        // Initialize behavior
        if (behaviorDef.init) {
            behaviorDef.init(npc);
        }

        if (this.config.debugLogging) {
            console.log(`[NPC] ${npcId} behavior: ${npc.previousBehavior} -> ${behaviorId}`);
        }
    },

    /**
     * Revert to previous behavior
     * @param {string} npcId - The NPC ID
     */
    revertBehavior(npcId) {
        const npc = this.npcs.get(npcId);
        if (!npc || !npc.previousBehavior) return;

        this.setBehavior(npcId, npc.previousBehavior);
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

        // Handle state-specific behaviors
        switch (newState) {
            case 'following':
                this.setBehavior(npcId, 'follow_player');
                break;
            case 'guiding':
                this.setBehavior(npcId, 'guide_to_destination');
                break;
            case 'fleeing':
                this.setBehavior(npcId, 'flee');
                break;
            case 'freed':
            case 'rescued':
            case 'departed':
                npc.interactable = false;
                break;
        }

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

        // Handle quest interactions
        if (npc.quests && npc.quests.length > 0) {
            for (const questId of npc.quests) {
                const quest = this.quests.get(questId);
                if (!quest) continue;

                switch (quest.state) {
                    case this.QUEST_STATES.AVAILABLE:
                        // Show quest dialogue, offer accept
                        const dialogue = quest.dialogue.available;
                        if (dialogue.length > 0) {
                            addMessage(`${npc.name}: "${dialogue[0]}"`);
                        }
                        addMessage(`[Accept quest: ${quest.name}? Press F again]`);
                        npc.pendingQuestAccept = questId;
                        return true;

                    case this.QUEST_STATES.READY:
                        // Turn in quest
                        const readyDialogue = quest.dialogue.ready;
                        if (readyDialogue.length > 0) {
                            addMessage(`${npc.name}: "${readyDialogue[0]}"`);
                        }
                        this.turnInQuest(questId);
                        return true;
                }
            }

            // Handle pending quest accept
            if (npc.pendingQuestAccept) {
                this.acceptQuest(npc.pendingQuestAccept);
                npc.pendingQuestAccept = null;
                return true;
            }
        }

        // Custom callback
        if (npc.onInteract) {
            npc.onInteract(npc, game.player);
        }

        // Show dialogue
        const dialogue = this.getDialogueForNPC(npcId);
        if (dialogue.length > 0) {
            const line = dialogue[npc.currentDialogueIndex % dialogue.length];
            addMessage(`${npc.name}: "${line}"`);
            npc.currentDialogueIndex++;
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
    // MOVEMENT
    // ========================================================================

    /**
     * Move NPC toward target position
     * @param {object} npc - The NPC
     * @param {number} targetX - Target grid X
     * @param {number} targetY - Target grid Y
     * @param {number} dt - Delta time
     * @returns {boolean} - True if arrived
     */
    moveToward(npc, targetX, targetY, dt) {
        const dx = targetX - npc.gridX;
        const dy = targetY - npc.gridY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.1) {
            npc.isMoving = false;
            return true;
        }

        const speed = npc.moveSpeed * (dt / 1000);
        const moveX = (dx / dist) * Math.min(speed, dist);
        const moveY = (dy / dist) * Math.min(speed, dist);

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

        return false;
    },

    /**
     * Teleport NPC to position
     * @param {string} npcId - NPC ID
     * @param {number} x - Target X
     * @param {number} y - Target Y
     */
    teleport(npcId, x, y) {
        const npc = this.npcs.get(npcId);
        if (!npc) return;

        // Clear old position
        const oldX = Math.floor(npc.gridX);
        const oldY = Math.floor(npc.gridY);
        if (game.map[oldY]?.[oldX]?.npc === npc.id) {
            delete game.map[oldY][oldX].npc;
        }

        // Set new position
        npc.gridX = x;
        npc.gridY = y;
        npc.displayX = x;
        npc.displayY = y;

        // Mark new position
        const newX = Math.floor(x);
        const newY = Math.floor(y);
        if (game.map[newY]?.[newX]) {
            game.map[newY][newX].npc = npc.id;
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

    // ========================================================================
    // DAMAGE & DEATH
    // ========================================================================

    damage(npcId, amount, source = null) {
        const npc = this.npcs.get(npcId);
        if (!npc || npc.health === null) return false;

        npc.health -= amount;

        if (npc.onDamage) {
            npc.onDamage(npc, amount, source);
        }

        // Trigger flee behavior if not hostile
        if (!npc.hostile && npc.health > 0) {
            npc.fleeFrom = source;
            this.setBehavior(npcId, 'flee');
        }

        if (npc.health <= 0) {
            this.kill(npcId);
            return true;
        }

        return false;
    },

    kill(npcId) {
        const npc = this.npcs.get(npcId);
        if (!npc) return;

        npc.state = 'dead';
        npc.visible = false;
        npc.interactable = false;

        // Fail any active quests from this NPC
        if (npc.quests) {
            npc.quests.forEach(questId => {
                const quest = this.quests.get(questId);
                if (quest && quest.state === this.QUEST_STATES.ACTIVE) {
                    this.failQuest(questId);
                }
            });
        }

        if (npc.onDeath) {
            npc.onDeath(npc);
        }

        addMessage(`${npc.name} has died!`);
    },

    heal(npcId, amount) {
        const npc = this.npcs.get(npcId);
        if (!npc || npc.health === null) return;

        npc.health = Math.min(npc.maxHealth, npc.health + amount);
    },

    // ========================================================================
    // UPDATE & LIFECYCLE
    // ========================================================================

    update(dt) {
        // Update quest timers
        this.quests.forEach(quest => {
            if (quest.state === this.QUEST_STATES.ACTIVE && quest.timeLimit) {
                quest.timer += dt;
                if (quest.timer >= quest.timeLimit) {
                    this.failQuest(quest.id);
                }
            }
        });

        // Update NPCs
        this.npcs.forEach((npc, id) => {
            if (npc.state === 'dead') return;

            // Update behavior
            const behaviorDef = this.BEHAVIORS[npc.behavior];
            if (behaviorDef?.update) {
                behaviorDef.update(npc, dt);
            }

            // Update animation state
            npc.animationState = npc.isMoving ? 'walking' : 'idle';
        });
    },

    cleanup() {
        this.npcs.forEach(npc => {
            const mapX = Math.floor(npc.gridX);
            const mapY = Math.floor(npc.gridY);
            if (game.map[mapY]?.[mapX]?.npc === npc.id) {
                delete game.map[mapY][mapX].npc;
            }
        });

        this.npcs.clear();
        this.activeEscorts.clear();
        this.quests.clear();
        this.dialogueActive = null;

        if (this.config.debugLogging) {
            console.log('[NPC] System cleaned up');
        }
    },

    // ========================================================================
    // QUERY METHODS
    // ========================================================================

    getAll() {
        return Array.from(this.npcs.values());
    },

    getByType(type) {
        return Array.from(this.npcs.values()).filter(npc => npc.type === type);
    },

    getByState(state) {
        return Array.from(this.npcs.values()).filter(npc => npc.state === state);
    },

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
        const byBehavior = {};

        this.npcs.forEach(npc => {
            byType[npc.type] = (byType[npc.type] || 0) + 1;
            byState[npc.state] = (byState[npc.state] || 0) + 1;
            byBehavior[npc.behavior] = (byBehavior[npc.behavior] || 0) + 1;
        });

        const questsByState = {};
        this.quests.forEach(quest => {
            questsByState[quest.state] = (questsByState[quest.state] || 0) + 1;
        });

        return {
            totalNPCs: this.npcs.size,
            byType,
            byState,
            byBehavior,
            totalQuests: this.quests.size,
            questsByState
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

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('npc-system', NPCSystemDef, 41);
} else {
    console.warn('[NPC] SystemManager not found - running standalone');
}

// ============================================================================
// EXPORTS
// ============================================================================
window.NPCSystem = NPCSystem;

console.log('✅ NPC System loaded (with quests and behaviors)');
