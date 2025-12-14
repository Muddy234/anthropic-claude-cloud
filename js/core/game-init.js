// ============================================================================
// GAME INITIALIZATION - The Shifting Chasm
// ============================================================================
// Updated: Registers all new systems, element-based initialization
// Now supports starting in village hub (Survival Extraction Update)
// ============================================================================

// ============================================================================
// MAIN GAME START
// ============================================================================

/**
 * Start the game in the village hub (default start)
 * This is the new default entry point for the Survival Extraction update
 */
function startInVillage() {
    console.log('🏘️ Starting in Village Hub...');
    console.log('═'.repeat(50));

    // === Phase 1: Cleanup ===
    cleanupPreviousGame();

    // === Phase 2: Initialize Persistent State ===
    initializePersistentState();

    // === Phase 3: Set up Village ===
    initializeVillage();

    // === Phase 4: Create Player (village version) ===
    initializeVillagePlayer();

    // === Phase 5: Initialize Systems ===
    initializeVillageSystems();

    console.log('═'.repeat(50));
    console.log('✅ Village initialized! Welcome to the surface.');
}

/**
 * Initialize persistent state for survival mode
 */
function initializePersistentState() {
    console.log('[Init] Setting up persistent state...');

    // SurvivalIntegration handles this
    if (typeof SurvivalIntegration !== 'undefined') {
        SurvivalIntegration.init();
    }
}

/**
 * Initialize the village
 */
function initializeVillage() {
    console.log('[Init] Generating village...');

    // Set game state to village
    game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';

    // Initialize village system
    if (typeof VillageSystem !== 'undefined') {
        VillageSystem.init();
    } else {
        console.error('[Init] VillageSystem not found!');
    }
}

/**
 * Initialize player for village (minimal, no combat)
 */
function initializeVillagePlayer() {
    console.log('[Init] Setting up village player...');

    // Create basic player object if needed
    if (!game.player) {
        game.player = typeof createPlayer === 'function' ? createPlayer() : createDefaultPlayer();
    }

    // Player position is managed by villageState, not game.player in village mode
}

/**
 * Initialize systems needed for village
 */
function initializeVillageSystems() {
    console.log('[Init] Initializing village systems...');

    // Initialize survival systems
    const villageSystems = [
        'BankingSystem',
        'QuestSystem',
        'CraftingSystem',
        'ShortcutSystem',
        'DegradationSystem',
        'RescueSystem'
    ];

    villageSystems.forEach(systemName => {
        if (typeof window[systemName] !== 'undefined' && typeof window[systemName].init === 'function') {
            try {
                window[systemName].init();
                console.log(`  ✅ ${systemName} initialized`);
            } catch (e) {
                console.error(`  ❌ ${systemName} failed:`, e);
            }
        }
    });
}

/**
 * Start a dungeon run from the village
 * Called when player confirms loadout at Chasm Entrance
 * @param {Object} options - { startingFloor, loadout }
 */
function startDungeonRun(options = {}) {
    const { startingFloor = 1, loadout = null } = options;

    console.log(`⛏️ Starting dungeon run on Floor ${startingFloor}...`);
    console.log('═'.repeat(50));

    // Clean up village state
    if (typeof VillageSystem !== 'undefined' && VillageSystem._keyHandler) {
        window.removeEventListener('keydown', VillageSystem._keyHandler);
    }

    // Start session through SessionManager
    if (typeof SessionManager !== 'undefined') {
        SessionManager.startRun(startingFloor, loadout || [], 0);
        // Note: SessionManager.startRun() handles stats.totalRuns increment
    } else if (typeof sessionState !== 'undefined') {
        // Fallback if SessionManager not loaded yet
        sessionState.active = true;
        sessionState.runId = Date.now().toString(36);
        sessionState.startTime = Date.now();
        sessionState.startFloor = startingFloor;
        sessionState.currentFloor = startingFloor;
        sessionState.floorStartTime = Date.now();
        sessionState.inventory = [];
        sessionState.gold = 0;

        // Update stats only in fallback case
        if (typeof persistentState !== 'undefined' && persistentState.stats) {
            persistentState.stats.totalRuns = (persistentState.stats.totalRuns || 0) + 1;
        }
    }

    // Reset game state for dungeon
    resetGameState();

    // Generate the dungeon floor
    game.floor = startingFloor;
    generateDungeon();

    // Initialize player for dungeon
    initializePlayer();

    // Apply loadout if provided
    if (loadout) {
        applyLoadoutToPlayer(loadout);
    }

    // Initialize all dungeon systems
    initializeAllSystems();

    // Initialize extraction points for this floor
    if (typeof ExtractionSystem !== 'undefined' && game.rooms) {
        const spawnRoom = game.rooms.find(r => r.type === 'entrance');
        ExtractionSystem.init(startingFloor, game.rooms, spawnRoom);
    }

    // Post-init
    postInitialization();

    console.log('═'.repeat(50));
    console.log(`✅ Floor ${startingFloor} ready! Good luck, delver.`);
    logGameStats();
}

/**
 * Apply loadout equipment to player
 * @param {Object} loadout - { weapon, armor, consumables }
 */
function applyLoadoutToPlayer(loadout) {
    if (!game.player || !loadout) return;

    console.log('[Init] Applying loadout...');

    // Equip weapon
    if (loadout.weapon && game.player.equipped) {
        game.player.equipped.MAIN = { ...loadout.weapon };
        console.log(`  - Weapon: ${loadout.weapon.name}`);
    }

    // Equip armor
    if (loadout.armor && game.player.equipped) {
        game.player.equipped.CHEST = { ...loadout.armor };
        console.log(`  - Armor: ${loadout.armor.name}`);
    }

    // Add consumables to inventory
    if (loadout.consumables && Array.isArray(loadout.consumables)) {
        loadout.consumables.forEach(item => {
            if (item) {
                game.player.inventory = game.player.inventory || [];
                game.player.inventory.push({ ...item });
                console.log(`  - Consumable: ${item.name}`);
            }
        });
    }
}

/**
 * Return to village from dungeon (after extraction or death)
 */
function returnToVillage() {
    console.log('🏘️ Returning to village...');

    // Clean up dungeon state
    cleanupPreviousGame();

    // Reset to village
    game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';

    // Re-initialize village
    if (typeof VillageSystem !== 'undefined') {
        VillageSystem.init();
    }

    // Clear session
    if (typeof sessionState !== 'undefined') {
        sessionState.active = false;
    }

    console.log('✅ Back in the village.');
}

/**
 * Start a new game - now starts in village by default
 * For Survival Extraction update
 */
function startNewGame() {
    // Start in village hub by default
    startInVillage();
}

/**
 * Legacy function: Start directly in dungeon (for testing or quick play)
 */
function startNewGameDungeon() {
    console.log('🎮 Starting new game (direct dungeon)...');
    console.log('═'.repeat(50));

    // === Phase 1: Cleanup ===
    cleanupPreviousGame();

    // === Phase 2: Reset Game State ===
    resetGameState();

    // === Phase 3: Generate Dungeon ===
    generateDungeon();

    // === Phase 4: Create Player ===
    initializePlayer();

    // === Phase 5: Initialize All Systems ===
    initializeAllSystems();

    // === Phase 6: Post-Init ===
    postInitialization();

    console.log('═'.repeat(50));
    console.log('✅ Game initialized successfully!');
    logGameStats();
}

// ============================================================================
// INITIALIZATION PHASES
// ============================================================================

/**
 * Phase 1: Cleanup previous game state
 */
function cleanupPreviousGame() {
    console.log('[Init] Cleaning up previous game...');
    
    if (typeof SystemManager !== 'undefined') {
        SystemManager.cleanupAll();
    }
    
    // Clear any lingering intervals/timeouts
    if (game._intervals) {
        game._intervals.forEach(id => clearInterval(id));
    }
    if (game._timeouts) {
        game._timeouts.forEach(id => clearTimeout(id));
    }
}

/**
 * Phase 2: Reset game state to defaults
 */
function resetGameState() {
    console.log('[Init] Resetting game state...');
    
    game.state = 'playing';
    game.floor = 1;
    game.enemies = [];
    game.decorations = [];
    game._altarsPlacedThisFloor = 0; // Reset altar counter for new floor
    game.doorways = [];
    game.rooms = [];
    game.groundLoot = [];
    
    // Shift system
    game.shiftMeter = 0;
    game.shiftActive = false;
    game.activeShift = null;
    
    // Eruption timer
    game.eruption = { timer: 180, lastDamage: 0 };
    
    // Tracking
    game._intervals = [];
    game._timeouts = [];
}

/**
 * Phase 3: Generate the dungeon
 */
function generateDungeon() {
    console.log('[Init] Generating dungeon...');

    // ONLY use blob-based generator (no fallback to old system)
    if (typeof generateBlobDungeon !== 'function') {
        console.error('[Init] ❌ generateBlobDungeon not found! Check that dungeon-integration.js is loaded.');
        console.error('[Init] Available functions:', Object.keys(window).filter(k => k.includes('generate')));
        throw new Error('Blob dungeon generator not available');
    }

    console.log('[Init] ✅ Using blob-based dungeon generator');
    generateBlobDungeon();

    // Spawn hazards (blob generator doesn't handle this yet)
    if (typeof HazardSystem !== 'undefined') {
        HazardSystem.spawnForAllRooms();
    }
}

/**
 * Phase 4: Create and place player
 */
function initializePlayer() {
    console.log('[Init] Creating player...');

    game.player = typeof createPlayer === 'function' ? createPlayer() : createDefaultPlayer();

    // Equip starting torch for fog of war vision
    equipStartingTorch();

    // Find entrance room
    const entranceRoom = game.rooms.find(r => r.type === 'entrance');

    if (entranceRoom) {
        // Use safe spawn chamber to ensure we spawn on a valid floor tile
        // This handles the case where chamber center might be a wall
        let spawnX, spawnY;

        if (typeof getSafeSpawnChamber === 'function') {
            const safeSpawn = getSafeSpawnChamber(entranceRoom);
            spawnX = safeSpawn.x;
            spawnY = safeSpawn.y;
        } else {
            // Fallback if chamber generator not loaded
            spawnX = (entranceRoom.floorX || entranceRoom.x + 1) +
                           Math.floor((entranceRoom.floorWidth || 20) / 2);
            spawnY = (entranceRoom.floorY || entranceRoom.y + 1) +
                           Math.floor((entranceRoom.floorHeight || 20) / 2);
        }

        setPlayerPosition(spawnX, spawnY);
        console.log(`[Init] Player spawned at (${spawnX}, ${spawnY})`);
    } else {
        console.error('[Init] No entrance room found!');
        setPlayerPosition(40, 40);
    }

    // Initialize camera
    initializeCamera();
}

/**
 * Phase 5: Initialize all game systems
 */
function initializeAllSystems() {
    console.log('[Init] Initializing systems...');

    // Load monster sprites
    if (typeof loadMonsterSprites === 'function') {
        loadMonsterSprites();
        console.log('[Init] Loading monster sprites...');
    }

    if (typeof SystemManager !== 'undefined') {
        // Register new systems if not already registered
        registerNewSystems();

        // Initialize all systems
        SystemManager.initAll(game);

        // Verify all expected systems are present
        SystemManager.verify();
    } else {
        // Fallback: Initialize systems manually
        initializeSystemsManually();
    }
}

/**
 * Phase 6: Post-initialization tasks
 */
function postInitialization() {
    console.log('[Init] Post-initialization...');

    // Form social groups
    if (typeof MonsterSocialSystem !== 'undefined') {
        MonsterSocialSystem.scanAndFormGroups();
    }

    // Place starter chest near player
    placeStarterChest();

    // Show entrance room message
    const entranceRoom = game.rooms.find(r => r.type === 'entrance');
    if (entranceRoom && typeof getRoomEnterEffect === 'function') {
        const effect = getRoomEnterEffect(entranceRoom, game.player);
        if (effect && typeof addMessage === 'function') {
            addMessage(effect.message);
        }
    }
}

/**
 * Place a starter chest near the player spawn with guaranteed loot
 */
function placeStarterChest() {
    if (!game.player || !game.rooms) {
        console.warn('[Init] Cannot place starter chest - player or rooms not initialized');
        return;
    }

    // Find entrance room
    const entranceRoom = game.rooms.find(r => r.type === 'entrance');
    if (!entranceRoom) {
        console.warn('[Init] Cannot place starter chest - no entrance room found');
        return;
    }

    const playerX = game.player.gridX;
    const playerY = game.player.gridY;

    // Find a valid floor tile adjacent to player (prefer right or down)
    const offsets = [
        { x: 1, y: 0 },   // Right
        { x: 0, y: 1 },   // Down
        { x: -1, y: 0 },  // Left
        { x: 0, y: -1 },  // Up
        { x: 1, y: 1 },   // Down-right
        { x: -1, y: 1 },  // Down-left
    ];

    let chestX = null, chestY = null;

    for (const offset of offsets) {
        const testX = playerX + offset.x;
        const testY = playerY + offset.y;

        // Check if valid floor tile
        const tile = game.map[testY]?.[testX];
        if (tile && tile.type === 'floor' && !tile.blocked && !tile.decoration) {
            // Check no decoration already there in global array
            const existingDec = game.decorations?.find(d => d.x === testX && d.y === testY);
            if (!existingDec) {
                chestX = testX;
                chestY = testY;
                break;
            }
        }
    }

    if (chestX === null) {
        console.warn('[Init] Could not find valid position for starter chest');
        return;
    }

    // Create the starter chest decoration with proper format for rendering
    const starterChest = {
        x: chestX,
        y: chestY,
        type: 'starter_chest',
        room: entranceRoom,
        element: entranceRoom.element || 'physical',
        blocking: false,
        interactable: true,
        sprite: null,
        color: '#FFD700',
        name: 'Supply Chest',
        description: 'A chest left by previous adventurers.',

        // Data object for decoration-renderer.js compatibility
        data: {
            color: '#FFD700',
            symbol: '📦',
            glow: true,
            glowRadius: 0.8,
            size: 'large'
        }
    };

    // Add to game decorations array
    if (!game.decorations) game.decorations = [];
    game.decorations.push(starterChest);

    // Add to room's decorations array (required for rendering)
    if (!entranceRoom.decorations) entranceRoom.decorations = [];
    entranceRoom.decorations.push(starterChest);

    // Mark tile as having decoration
    const tile = game.map?.[chestY]?.[chestX];
    if (tile) {
        tile.decoration = starterChest;
    }

    console.log(`[Init] Placed starter chest at (${chestX}, ${chestY})`);
}

/**
 * Open the starter chest - shows UI with predetermined loot
 */
function openStarterChest(chest, player) {
    if (!chest || chest.type !== 'starter_chest') return false;

    // Get torch from equipment data
    const torch = typeof MOBILITY_ARMOR !== 'undefined' ? MOBILITY_ARMOR['torch'] :
                  typeof DEFENSE_ARMOR !== 'undefined' ? DEFENSE_ARMOR['torch'] : null;

    // Get health potion from consumables
    const healthPotion = typeof CONSUMABLES !== 'undefined' ? CONSUMABLES['health_potion'] : null;

    // Get random uncommon mainhand weapon
    const randomWeapon = getRandomUncommonMainhand();

    // Build chest contents array
    const contents = [];

    // Add torch
    if (torch) {
        contents.push({
            ...torch,
            count: 1,
            type: 'armor'
        });
    }

    // Add 2 health potions (as single stack)
    if (healthPotion) {
        contents.push({
            ...healthPotion,
            count: 2,
            type: 'consumable'
        });
    }

    // Add random uncommon weapon
    if (randomWeapon) {
        contents.push({
            ...randomWeapon,
            count: 1,
            type: 'weapon'
        });
    }

    // Open the chest UI with contents
    if (typeof openChestUI === 'function' && contents.length > 0) {
        openChestUI(chest, contents);
        console.log('[Init] Starter chest UI opened with', contents.length, 'items');
        return true;
    }

    // Fallback: just mark as opened if UI not available
    chest.interactable = false;
    chest.type = 'starter_chest_open';
    chest.description = 'An empty chest.';
    if (chest.data) {
        chest.data.symbol = '📭';
        chest.data.glow = false;
    }

    console.log('[Init] Starter chest opened (no UI)');
    return true;
}

/**
 * Get a random uncommon mainhand weapon from all weapon pools
 */
function getRandomUncommonMainhand() {
    const uncommonWeapons = [];

    // Collect from melee weapons
    if (typeof MELEE_WEAPONS !== 'undefined') {
        for (const id in MELEE_WEAPONS) {
            const weapon = MELEE_WEAPONS[id];
            if (weapon.rarity === 'uncommon' && weapon.slot === 'MAIN') {
                uncommonWeapons.push(weapon);
            }
        }
    }

    // Collect from ranged weapons (polearms, bows)
    if (typeof RANGED_WEAPONS !== 'undefined') {
        for (const id in RANGED_WEAPONS) {
            const weapon = RANGED_WEAPONS[id];
            if (weapon.rarity === 'uncommon' && weapon.slot === 'MAIN') {
                uncommonWeapons.push(weapon);
            }
        }
    }

    // Collect from magic weapons
    if (typeof MAGIC_WEAPONS !== 'undefined') {
        for (const id in MAGIC_WEAPONS) {
            const weapon = MAGIC_WEAPONS[id];
            if (weapon.rarity === 'uncommon' && weapon.slot === 'MAIN') {
                uncommonWeapons.push(weapon);
            }
        }
    }

    if (uncommonWeapons.length === 0) {
        console.warn('[Init] No uncommon mainhand weapons found');
        return null;
    }

    // Return random weapon
    const randomIndex = Math.floor(Math.random() * uncommonWeapons.length);
    return uncommonWeapons[randomIndex];
}

// Export starter chest functions
window.openStarterChest = openStarterChest;
window.placeStarterChest = placeStarterChest;

// ============================================================================
// SYSTEM REGISTRATION
// ============================================================================

/**
 * Register all new systems with SystemManager
 */
function registerNewSystems() {
    // Status Effect System
    if (typeof StatusEffectSystem !== 'undefined' && !SystemManager.has('status-effects')) {
        SystemManager.register('status-effects', {
            name: 'status-effects',
            init: () => StatusEffectSystem.init(),
            update: (dt) => StatusEffectSystem.update(dt),
            cleanup: () => StatusEffectSystem.cleanup()
        }, 55);
    }
    
    // Hazard System
    if (typeof HazardSystem !== 'undefined' && !SystemManager.has('hazards')) {
        SystemManager.register('hazards', {
            name: 'hazards',
            init: () => HazardSystem.init(),
            update: (dt) => HazardSystem.update(dt),
            cleanup: () => HazardSystem.cleanup()
        }, 35);
    }

    // Monster Social System
    if (typeof MonsterSocialSystem !== 'undefined' && !SystemManager.has('monster-social')) {
        SystemManager.register('monster-social', {
            name: 'monster-social',
            init: () => MonsterSocialSystem.init(),
            update: (dt) => MonsterSocialSystem.update(dt),
            cleanup: () => MonsterSocialSystem.cleanup()
        }, 42);
    }

    // Vision System (Fog of War)
    if (typeof VisionSystem !== 'undefined' && !SystemManager.has('vision')) {
        SystemManager.register('vision', {
            name: 'vision',
            init: () => VisionSystem.init(game),
            update: (dt) => VisionSystem.update(dt),
            cleanup: () => {}
        }, 5); // High priority - runs early each frame
    }
}

/**
 * Fallback: Initialize systems without SystemManager
 */
function initializeSystemsManually() {
    console.warn('[Init] SystemManager not found - manual initialization');
    
    // Noise System
    if (typeof NoiseSystem !== 'undefined') {
        NoiseSystem.init(game);
        console.log('  ✅ NoiseSystem initialized');
    }
    
    // AI Manager
    if (typeof AIManager !== 'undefined') {
        AIManager.init(game);
        // Register existing enemies
        for (const enemy of game.enemies) {
            if (!enemy.ai) {
                AIManager.registerEnemy(enemy);
            }
        }
        console.log('  ✅ AIManager initialized');
    }
    
    // Status Effects
    if (typeof StatusEffectSystem !== 'undefined') {
        StatusEffectSystem.init();
        console.log('  ✅ StatusEffectSystem initialized');
    }
    
    // Hazards
    if (typeof HazardSystem !== 'undefined') {
        HazardSystem.init();
        console.log('  ✅ HazardSystem initialized');
    }

    // Social System
    if (typeof MonsterSocialSystem !== 'undefined') {
        MonsterSocialSystem.init();
        console.log('  ✅ MonsterSocialSystem initialized');
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Set player position
 */
function setPlayerPosition(x, y) {
    game.player.gridX = x;
    game.player.gridY = y;
    game.player.x = x;
    game.player.y = y;
    game.player.displayX = x;
    game.player.displayY = y;
    game.player.targetGridX = x;
    game.player.targetGridY = y;
}

/**
 * Equip starting torch for fog of war
 * NOTE: Starting torch removed from loadout - player must find torch in starter chest
 */
function equipStartingTorch() {
    // Starting torch is now in the starter chest instead of being auto-equipped
    // Player spawns without a torch and must open the nearby chest to get one
    console.log('[Init] No starting torch - player must find one in starter chest');
}

/**
 * Initialize camera
 */
function initializeCamera() {
    if (!game.camera) {
        game.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
    }
    game.camera.x = game.player.gridX;
    game.camera.y = game.player.gridY;
    game.camera.targetX = game.player.gridX;
    game.camera.targetY = game.player.gridY;
}

/**
 * Create default player (fallback)
 */
function createDefaultPlayer() {
    return {
        gridX: 40, gridY: 40, x: 40, y: 40,
        displayX: 40, displayY: 40,
        hp: 100, maxHp: 100,
        stats: { STR: 10, AGI: 10, INT: 10, STA: 10 },
        equipped: { HEAD: null, CHEST: null, LEGS: null, FEET: null, MAIN: null, OFF: null },
        inventory: [],
        combat: { isInCombat: false, currentTarget: null, attackCooldown: 0, attackSpeed: 1.0, autoRetaliate: true, attackRange: 1 }
    };
}

/**
 * Log game statistics
 */
function logGameStats() {
    console.log('📊 Game Statistics:');
    console.log(`   Rooms: ${game.rooms?.length || 0}`);
    console.log(`   Doorways: ${game.doorways?.length || 0}`);
    console.log(`   Enemies: ${game.enemies?.length || 0}`);
    console.log(`   Decorations: ${game.decorations?.length || 0}`);
    console.log(`   Hazards: ${typeof HazardSystem !== 'undefined' ? HazardSystem.hazards.length : 0}`);
    
    // Element distribution
    if (game.rooms) {
        const elementCounts = {};
        game.rooms.forEach(r => {
            elementCounts[r.element] = (elementCounts[r.element] || 0) + 1;
        });
        console.log('   Room elements:', elementCounts);
    }
    
    // Tier distribution
    logEnemyTierDistribution();
}

/**
 * Log enemy tier distribution
 */
function logEnemyTierDistribution() {
    if (!game.enemies || game.enemies.length === 0) return;
    
    const tierCounts = { 'TIER_3': 0, 'TIER_2': 0, 'TIER_1': 0, 'ELITE': 0, 'unknown': 0 };
    
    for (const enemy of game.enemies) {
        const tier = enemy.tier || 'unknown';
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    }
    
    console.log('   Enemy tiers:', tierCounts);
}

// ============================================================================
// FLOOR ADVANCEMENT
// ============================================================================

/**
 * Advance to next floor
 */
function advanceToNextFloor() {
    console.log(`📈 Advancing to floor ${game.floor + 1}...`);
    
    // Cleanup
    cleanupPreviousGame();
    
    // Increment floor
    game.floor++;
    
    // Reset floor-specific state (keep player, gold, etc.)
    game.enemies = [];
    game.decorations = [];
    game._altarsPlacedThisFloor = 0; // Reset altar counter for new floor
    game.doorways = [];
    game.rooms = [];
    game.groundLoot = [];
    game.shiftMeter = 0;
    game.shiftActive = false;
    game.activeShift = null;
    game.eruption = { timer: 180, lastDamage: 0 };
    
    // Regenerate
    generateDungeon();
    
    // Place player
    const entranceRoom = game.rooms.find(r => r.type === 'entrance');
    if (entranceRoom) {
        const spawnX = (entranceRoom.floorX || entranceRoom.x + 1) + Math.floor((entranceRoom.floorWidth || 20) / 2);
        const spawnY = (entranceRoom.floorY || entranceRoom.y + 1) + Math.floor((entranceRoom.floorHeight || 20) / 2);
        setPlayerPosition(spawnX, spawnY);
    }
    
    initializeCamera();
    initializeAllSystems();

    // Re-initialize extraction points for new floor
    if (typeof ExtractionSystem !== 'undefined' && game.rooms) {
        const entranceRoom = game.rooms.find(r => r.type === 'entrance');
        ExtractionSystem.init(game.floor, game.rooms, entranceRoom);
        console.log(`[Init] ExtractionSystem reinitialized for floor ${game.floor}`);
    }

    postInitialization();
    
    console.log(`✅ Floor ${game.floor} ready!`);
    logGameStats();
}

/**
 * Restart game after death
 */
function restartGame() {
    console.log('🔄 Restarting game...');
    startNewGame();
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    // Village start functions (Survival Extraction Update)
    window.startInVillage = startInVillage;
    window.startDungeonRun = startDungeonRun;
    window.returnToVillage = returnToVillage;

    // Legacy/core functions
    window.startNewGame = startNewGame;
    window.startNewGameDungeon = startNewGameDungeon;
    window.restartGame = restartGame;
    window.advanceToNextFloor = advanceToNextFloor;
    window.logGameStats = logGameStats;
    window.logEnemyTierDistribution = logEnemyTierDistribution;
}

console.log('✅ Game initialization loaded (with new systems)');
