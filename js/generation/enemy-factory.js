// ============================================================================
// ENEMY FACTORY - The Shifting Chasm
// ============================================================================
// Unified enemy creation module - single source of truth for creating enemies.
// All spawning systems (enemy-spawner, dungeon-integration, spawn-point-system)
// should use this factory to ensure consistent enemy stats and initialization.
// ============================================================================

const EnemyFactory = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    config: {
        debugLogging: false
    },

    // ========================================================================
    // MAIN CREATION METHOD
    // ========================================================================

    /**
     * Create an enemy entity from monster data
     * @param {Object} options - Creation options
     * @param {string} options.monsterType - The monster type ID (from MONSTER_DATA)
     * @param {number} options.x - Grid X position
     * @param {number} options.y - Grid Y position
     * @param {Object} [options.room] - Room reference (optional)
     * @param {number} [options.floor] - Floor number for scaling (defaults to game.floor)
     * @param {string} [options.spawnPointId] - Spawn point ID if created by SpawnPointSystem
     * @param {string} [options.spawnPointType] - Spawn point type if created by SpawnPointSystem
     * @param {number} [options.difficultyScale] - Additional difficulty multiplier (default 1.0)
     * @returns {Object|null} The created enemy or null on failure
     */
    create(options) {
        const {
            monsterType,
            x,
            y,
            room = null,
            floor = null,
            spawnPointId = null,
            spawnPointType = null,
            difficultyScale = 1.0
        } = options;

        // Validate monster type
        const template = typeof MONSTER_DATA !== 'undefined' ? MONSTER_DATA[monsterType] : null;

        if (!template) {
            console.error(`[EnemyFactory] Unknown monster type: ${monsterType}`);
            return null;
        }

        // Get tier data for AI configuration
        const tierData = typeof getMonsterAIConfig === 'function'
            ? getMonsterAIConfig(monsterType)
            : null;

        // Get tier indicator for display
        const tierIndicator = this._getTierIndicator(monsterType);

        // Determine floor for stat scaling (monster level = floor number)
        const currentFloor = floor ?? ((typeof game !== 'undefined' && game.floor) ? game.floor : 1);

        // Apply floor-based stat scaling
        const stats = typeof applyTierMultipliers === 'function'
            ? applyTierMultipliers(template, monsterType, currentFloor)
            : { ...template };

        // Apply additional difficulty scale if provided (for spawn points, etc.)
        if (difficultyScale !== 1.0) {
            stats.hp = Math.floor(stats.hp * difficultyScale);
            stats.str = Math.floor(stats.str * difficultyScale);
            stats.pDef = Math.floor(stats.pDef * difficultyScale);
            stats.mDef = Math.floor(stats.mDef * difficultyScale);
        }

        // Random facing direction
        const directions = ['up', 'down', 'left', 'right'];
        const facing = directions[Math.floor(Math.random() * directions.length)];

        // Generate unique ID
        const uniqueId = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const enemy = {
            // Identity
            id: uniqueId,
            name: monsterType,
            typeId: monsterType,

            // Tier info
            tier: template.tier || 'TIER_3',
            tierIndicator: tierIndicator.indicator,
            tierColor: tierIndicator.color,

            // Position
            gridX: x,
            gridY: y,
            x: x,
            y: y,
            displayX: x,
            displayY: y,
            targetGridX: x,
            targetGridY: y,

            // Movement
            isMoving: false,
            moveProgress: 0,
            moveSpeed: stats.speed || template.movement?.baseSpeed || 3,
            facing: facing,

            // Collision
            blockingRadius: template.elite ? 1.0 : 0.75,

            // Monster level (ALWAYS equal to floor number for consistency)
            level: currentFloor,

            // Stats (scaled by floor level)
            hp: stats.hp || 50,
            maxHp: stats.hp || 50,
            str: stats.str || 10,
            agi: stats.agi || 10,
            int: stats.int || 10,
            pDef: stats.pDef || 0,
            mDef: stats.mDef || 0,

            // Mana (scales with INT, magic monsters have more)
            mp: this._calculateMonsterMana(template),
            maxMp: this._calculateMonsterMana(template),
            manaRegen: this._calculateMonsterManaRegen(template),

            // Element
            element: template.element || 'physical',
            armorType: template.armorType || 'unarmored',
            damageType: template.damageType || 'physical',

            // Behavior
            behaviorType: this._determineBehaviorType(template),
            behavior: this._createBehaviorObject(template),
            state: 'idle',

            // Perception
            perception: template.perception || { sightRange: 6, hearingRange: 4 },
            aggression: template.perception?.sightRange || 6,

            // Room reference
            room: room,
            spawnRoom: room,

            // Combat - use individual monster values from tierData (via buildCombatConfig)
            combat: {
                isInCombat: false,
                currentTarget: null,
                attackCooldown: 0,
                attackSpeed: tierData?.combat?.attackSpeed || template.attackSpeed || 2.0,
                autoRetaliate: true,
                attackRange: tierData?.combat?.attackRange || template.attackRange || 1,
                comboCount: 1  // Enemy combo system: 1 -> 2 -> 3 (special) -> 1
            },

            // Loot (favor-based system - no gold)
            loot: template.loot || [],
            xp: stats.xp || this._calculateMonsterXP(template),

            // Status
            statusEffects: [],
            isUndead: template.isUndead || template.element === 'death',

            // Social
            social: template.social || {},
            packId: null,
            swarmId: null,
            commandedBy: null,

            // Spawn point tracking (for SpawnPointSystem)
            spawnPointId: spawnPointId,
            spawnPointType: spawnPointType,

            // AI will be set by AIManager.registerEnemy()
            ai: null
        };

        if (this.config.debugLogging) {
            console.log(`[EnemyFactory] Created ${monsterType} (${enemy.tier}) at (${x}, ${y}) - Floor ${currentFloor}`);
        }

        return enemy;
    },

    /**
     * Create an enemy and register it with game systems
     * This is the preferred method for most use cases
     * @param {Object} options - Same options as create()
     * @returns {Object|null} The created and registered enemy
     */
    createAndRegister(options) {
        const enemy = this.create(options);
        if (!enemy) return null;

        // Initialize animation state
        if (typeof initEnemyAnimation === 'function') {
            initEnemyAnimation(enemy);
        }

        // Register with AI system
        if (typeof AIManager !== 'undefined') {
            AIManager.registerEnemy(enemy);
        }

        // Initialize abilities from repository
        if (typeof EnemyAbilitySystem !== 'undefined') {
            EnemyAbilitySystem.initializeEnemy(enemy);
        }

        // Journal/Codex tracking - discover monster type
        if (typeof discoverMonster === 'function') {
            discoverMonster(options.monsterType);
        }

        return enemy;
    },

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    /**
     * Get tier indicator for display
     * @private
     */
    _getTierIndicator(monsterType) {
        // Use MONSTER_TIERS if available
        if (typeof MONSTER_TIER_MAP !== 'undefined' && typeof MONSTER_TIERS !== 'undefined') {
            const tierId = MONSTER_TIER_MAP[monsterType] || 'TIER_3';
            const tierConfig = MONSTER_TIERS[tierId];
            if (tierConfig) {
                return {
                    indicator: tierConfig.indicator || '?',
                    color: tierConfig.color || '#888888'
                };
            }
        }
        return { indicator: '?', color: '#888888' };
    },

    /**
     * Calculate XP reward for monster
     * Uses the monster's base XP from MONSTER_DATA - tiers do NOT affect XP
     * @private
     */
    _calculateMonsterXP(template) {
        return template.xp || 20;
    },

    /**
     * Calculate monster mana pool based on INT stat
     * Magic monsters have significantly more mana
     * @private
     */
    _calculateMonsterMana(template) {
        const intStat = template.int || 10;
        const isMagic = template.attackType === 'magic';

        // Base mana: 50 + INT bonus
        // Magic monsters get 2x bonus
        const baseMana = 50;
        const intBonus = Math.floor(intStat * (isMagic ? 3 : 1));

        return baseMana + intBonus;
    },

    /**
     * Calculate monster mana regeneration rate
     * Based on INT, magic monsters regen faster
     * @private
     */
    _calculateMonsterManaRegen(template) {
        const intStat = template.int || 10;
        const isMagic = template.attackType === 'magic';

        // Base regen: 2/sec, scales with INT
        const baseRegen = 2;
        const intBonus = Math.floor(intStat / 10);

        return baseRegen + intBonus + (isMagic ? 2 : 0);
    },

    /**
     * Determine behavior type from monster template
     * @private
     */
    _determineBehaviorType(template) {
        // If template has behavior.type, use it
        if (template.behavior?.type) {
            return template.behavior.type;
        }

        // Otherwise, infer from aggression level
        const aggression = template.aggression || 2;
        const moveInterval = template.moveInterval || 2;

        if (aggression >= 5) return 'aggressive';
        if (aggression >= 3) return 'territorial';
        if (aggression <= 1) return 'passive';
        if (moveInterval >= 3) return 'patrol';

        return 'territorial'; // Default
    },

    /**
     * Create behavior object from monster template
     * @private
     */
    _createBehaviorObject(template) {
        if (template.behavior) {
            return template.behavior;
        }

        // Create behavior object from old schema
        const behaviorType = this._determineBehaviorType(template);

        return {
            type: behaviorType,
            aggression: template.aggression || 2,
            moveInterval: template.moveInterval || 2,
            chaseRange: (template.aggression || 2) * 3,
            retreatThreshold: 0.2
        };
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.EnemyFactory = EnemyFactory;
}

console.log('[EnemyFactory] Unified enemy creation module loaded');
