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
    cleanupPreviousGame();
    initializePersistentState();
    initializeVillage();
    initializeVillagePlayer();
    initializeVillageSystems();
}

/**
 * Initialize persistent state for survival mode
 */
function initializePersistentState() {
    if (typeof SurvivalIntegration !== 'undefined') {
        SurvivalIntegration.init();
    }
}

/**
 * Initialize the village
 */
function initializeVillage() {
    game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';

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
    if (!game.player) {
        game.player = typeof createPlayer === 'function' ? createPlayer() : createDefaultPlayer();
    }
}

/**
 * Initialize systems needed for village
 */
function initializeVillageSystems() {
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
            } catch (e) {
                console.error(`[Init] ${systemName} failed:`, e);
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

    // Clean up village state
    if (typeof VillageSystem !== 'undefined' && VillageSystem._keyHandler) {
        window.removeEventListener('keydown', VillageSystem._keyHandler);
    }

    // Start session through SessionManager
    if (typeof SessionManager !== 'undefined') {
        SessionManager.startRun(startingFloor, loadout || [], 0);
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

        if (typeof persistentState !== 'undefined' && persistentState.stats) {
            persistentState.stats.totalRuns = (persistentState.stats.totalRuns || 0) + 1;
        }
    }

    // Use shared initialization
    initializeDungeonCore({ floor: startingFloor, loadout });
}

/**
 * Apply loadout equipment to player
 * @param {Object} loadout - { weapon, armor, consumables }
 */
function applyLoadoutToPlayer(loadout) {
    if (!game.player || !loadout) return;

    if (loadout.weapon && game.player.equipped) {
        game.player.equipped.MAIN = { ...loadout.weapon };
    }

    if (loadout.armor && game.player.equipped) {
        game.player.equipped.CHEST = { ...loadout.armor };
    }

    if (loadout.consumables && Array.isArray(loadout.consumables)) {
        loadout.consumables.forEach(item => {
            if (item) {
                game.player.inventory = game.player.inventory || [];
                game.player.inventory.push({ ...item });
            }
        });
    }
}

/**
 * Return to village from dungeon (after extraction or death)
 */
function returnToVillage() {
    cleanupPreviousGame();
    game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';

    if (typeof VillageSystem !== 'undefined') {
        VillageSystem.init();
    }

    if (typeof sessionState !== 'undefined') {
        sessionState.active = false;
    }
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
    // Start session (CRITICAL for extraction to work)
    if (typeof SessionManager !== 'undefined') {
        SessionManager.startRun(1, [], 0);
    } else if (typeof sessionState !== 'undefined') {
        sessionState.active = true;
        sessionState.runId = Date.now().toString(36);
        sessionState.startTime = Date.now();
        sessionState.startFloor = 1;
        sessionState.currentFloor = 1;
        sessionState.floorStartTime = Date.now();
        sessionState.inventory = [];
        sessionState.gold = 0;
    }

    // Use shared initialization
    initializeDungeonCore({ floor: 1 });
}

// ============================================================================
// INITIALIZATION PHASES
// ============================================================================

/**
 * Core dungeon initialization - shared logic for all dungeon start scenarios
 * @param {Object} options - { floor, loadout, skipCleanup, skipSession }
 */
function initializeDungeonCore(options = {}) {
    const { floor = 1, loadout = null, skipCleanup = false, skipSession = false } = options;

    // Step 1: Cleanup (unless skipped, e.g., for floor advancement)
    if (!skipCleanup) {
        cleanupPreviousGame();
    }

    // Step 2: Reset game state
    resetGameState();
    game.floor = floor;

    // Step 3: Generate dungeon
    generateDungeon();

    // Step 4: Initialize player
    initializePlayer();

    // Step 5: Apply loadout if provided
    if (loadout) {
        applyLoadoutToPlayer(loadout);
    }

    // Step 6: Initialize all systems
    initializeAllSystems();

    // Step 7: Initialize extraction points
    if (typeof ExtractionSystem !== 'undefined' && game.rooms) {
        const spawnRoom = game.rooms.find(r => r.type === 'entrance');
        ExtractionSystem.init(floor, game.rooms, spawnRoom);
    }

    // Step 8: Post-initialization
    postInitialization();

    logGameStats();
}

/**
 * Phase 1: Cleanup previous game state
 */
function cleanupPreviousGame() {
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
    game.state = 'playing';
    game.floor = 1;
    game.enemies = [];
    game.decorations = [];
    game._altarsPlacedThisFloor = 0;
    game.doorways = [];
    game.rooms = [];
    game.groundLoot = [];
    game.shiftMeter = 0;
    game.shiftActive = false;
    game.activeShift = null;
    game.eruption = { timer: 180, lastDamage: 0 };
    game._intervals = [];
    game._timeouts = [];
}

/**
 * Phase 3: Generate the dungeon
 */
function generateDungeon() {
    if (typeof generateBlobDungeon !== 'function') {
        console.error('[Init] generateBlobDungeon not found!');
        throw new Error('Blob dungeon generator not available');
    }

    generateBlobDungeon();

    if (typeof HazardSystem !== 'undefined') {
        HazardSystem.spawnForAllRooms();
    }
}

/**
 * Phase 4: Create and place player
 */
function initializePlayer() {
    game.player = typeof createPlayer === 'function' ? createPlayer() : createDefaultPlayer();
    equipStartingTorch();

    const entranceRoom = game.rooms.find(r => r.type === 'entrance');

    if (entranceRoom) {
        let spawnX, spawnY;

        if (typeof getSafeSpawnChamber === 'function') {
            const safeSpawn = getSafeSpawnChamber(entranceRoom);
            spawnX = safeSpawn.x;
            spawnY = safeSpawn.y;
        } else {
            spawnX = (entranceRoom.floorX || entranceRoom.x + 1) +
                           Math.floor((entranceRoom.floorWidth || 20) / 2);
            spawnY = (entranceRoom.floorY || entranceRoom.y + 1) +
                           Math.floor((entranceRoom.floorHeight || 20) / 2);
        }

        setPlayerPosition(spawnX, spawnY);
    } else {
        console.error('[Init] No entrance room found!');
        setPlayerPosition(40, 40);
    }

    initializeCamera();
}

/**
 * Phase 5: Initialize all game systems
 */
function initializeAllSystems() {
    if (typeof loadMonsterSprites === 'function') {
        loadMonsterSprites();
    }

    registerNewSystems();
    SystemManager.initAll(game);
    SystemManager.verify();
}

/**
 * Phase 6: Post-initialization tasks
 */
function postInitialization() {
    if (typeof MonsterSocialSystem !== 'undefined') {
        MonsterSocialSystem.scanAndFormGroups();
    }

    placeStarterChest();

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
    if (!game.player || !game.rooms) return;

    const entranceRoom = game.rooms.find(r => r.type === 'entrance');
    if (!entranceRoom) return;

    const playerX = game.player.gridX;
    const playerY = game.player.gridY;

    const offsets = [
        { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
        { x: 0, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }
    ];

    let chestX = null, chestY = null;

    for (const offset of offsets) {
        const testX = playerX + offset.x;
        const testY = playerY + offset.y;
        const tile = game.map[testY]?.[testX];
        if (tile && tile.type === 'floor' && !tile.blocked && !tile.decoration) {
            const existingDec = game.decorations?.find(d => d.x === testX && d.y === testY);
            if (!existingDec) {
                chestX = testX;
                chestY = testY;
                break;
            }
        }
    }

    if (chestX === null) return;

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
        data: {
            color: '#FFD700',
            symbol: '📦',
            glow: true,
            glowRadius: 0.8,
            size: 'large'
        }
    };

    if (!game.decorations) game.decorations = [];
    game.decorations.push(starterChest);

    if (!entranceRoom.decorations) entranceRoom.decorations = [];
    entranceRoom.decorations.push(starterChest);

    const tile = game.map?.[chestY]?.[chestX];
    if (tile) {
        tile.decoration = starterChest;
    }
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

    if (typeof openChestUI === 'function' && contents.length > 0) {
        openChestUI(chest, contents);
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
// DECORATION INTERACTION HANDLER
// ============================================================================

/**
 * Handle interaction with decorations (shrines, chests, etc.)
 * Called from right-click-init.js when player clicks an interactable decoration
 * @param {object} decoration - The decoration being interacted with
 * @param {object} player - The player object
 */
function interactWithDecoration(decoration, player) {
    if (!decoration || !decoration.interactable) {
        return false;
    }

    const decorationType = decoration.type || '';

    // Handle shrine interactions
    if (decorationType === 'shrine' || decorationType === 'boon_shrine') {
        if (typeof openShrineUI === 'function') {
            return openShrineUI(decoration);
        } else {
            console.warn('[Interaction] ShrineUI not loaded');
            if (typeof addMessage === 'function') {
                addMessage('The shrine pulses with energy, but you cannot interact with it.');
            }
            return false;
        }
    }

    // Handle starter chest
    if (decorationType === 'starter_chest') {
        if (typeof openStarterChest === 'function') {
            return openStarterChest(decoration, player);
        }
        return false;
    }

    // Handle regular chests
    if (decorationType.includes('chest') && !decorationType.includes('open')) {
        if (typeof openChestUI === 'function' && decoration.contents) {
            return openChestUI(decoration, decoration.contents);
        }
        return false;
    }

    // Handle altars (future)
    if (decorationType === 'altar') {
        if (typeof addMessage === 'function') {
            addMessage('The altar hums with ancient power...');
        }
        return false;
    }

    // Unknown decoration type
    if (typeof addMessage === 'function') {
        addMessage(`You examine the ${decoration.name || 'object'}...`);
    }
    return false;
}

// Export interaction handler
window.interactWithDecoration = interactWithDecoration;

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
 * Advance to next floor (preserves player state)
 */
function advanceToNextFloor() {
    const nextFloor = game.floor + 1;

    // Cleanup systems
    cleanupPreviousGame();

    // Reset floor-specific state (keep player, gold, etc.)
    game.floor = nextFloor;
    game.enemies = [];
    game.decorations = [];
    game._altarsPlacedThisFloor = 0;
    game.doorways = [];
    game.rooms = [];
    game.groundLoot = [];
    game.shiftMeter = 0;
    game.shiftActive = false;
    game.activeShift = null;
    game.eruption = { timer: 180, lastDamage: 0 };

    // Regenerate dungeon
    generateDungeon();

    // Reposition player at entrance
    const entranceRoom = game.rooms.find(r => r.type === 'entrance');
    if (entranceRoom) {
        const spawnX = (entranceRoom.floorX || entranceRoom.x + 1) + Math.floor((entranceRoom.floorWidth || 20) / 2);
        const spawnY = (entranceRoom.floorY || entranceRoom.y + 1) + Math.floor((entranceRoom.floorHeight || 20) / 2);
        setPlayerPosition(spawnX, spawnY);
    }

    initializeCamera();
    initializeAllSystems();

    // Re-initialize extraction points
    if (typeof ExtractionSystem !== 'undefined' && game.rooms) {
        ExtractionSystem.init(nextFloor, game.rooms, entranceRoom);
    }

    postInitialization();
    logGameStats();
}

/**
 * Restart game after death
 */
function restartGame() {
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
    window.gameState = gameState;
}
