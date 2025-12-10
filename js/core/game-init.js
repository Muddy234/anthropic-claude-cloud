// ============================================================================
// GAME INITIALIZATION - The Shifting Chasm
// ============================================================================
// Updated: Registers all new systems, element-based initialization
// ============================================================================

// ============================================================================
// MAIN GAME START
// ============================================================================

/**
 * Start a new game - generates dungeon, spawns player, initializes systems
 */
function startNewGame() {
    console.log('🎮 Starting new game...');
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

    // Initialize attunement
    if (typeof AttunementSystem !== 'undefined') {
        AttunementSystem.init();
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
    
    // Attunement System
    if (typeof AttunementSystem !== 'undefined' && !SystemManager.has('attunement')) {
        SystemManager.register('attunement', {
            name: 'attunement',
            init: () => AttunementSystem.init(),
            update: (dt) => {
                const room = typeof getCurrentRoom === 'function' ? getCurrentRoom(game.player) : null;
                AttunementSystem.update(dt, game.player, room);
            },
            cleanup: () => AttunementSystem.cleanup()
        }, 45);
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
    
    // Attunement
    if (typeof AttunementSystem !== 'undefined') {
        AttunementSystem.init();
        console.log('  ✅ AttunementSystem initialized');
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
 * Assign elements to rooms if not already assigned
 */
function assignRoomElements() {
    if (!game.rooms) return;
    
    for (let i = 0; i < game.rooms.length; i++) {
        const room = game.rooms[i];
        
        if (!room.element) {
            // Get adjacent rooms for element spreading
            const adjacentRooms = game.rooms.filter((r, j) => {
                if (i === j) return false;
                // Simple adjacency check
                const dist = Math.abs(r.x - room.x) + Math.abs(r.y - room.y);
                return dist < 50; // Within range
            });
            
            room.element = typeof selectRoomElement === 'function'
                ? selectRoomElement(adjacentRooms)
                : getRandomElement();
        }
    }
}

/**
 * Get random element (fallback)
 */
function getRandomElement() {
    const elements = ['fire', 'ice', 'water', 'earth', 'nature', 'death', 'arcane', 'dark', 'holy', 'physical'];
    return elements[Math.floor(Math.random() * elements.length)];
}

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
    window.startNewGame = startNewGame;
    window.restartGame = restartGame;
    window.advanceToNextFloor = advanceToNextFloor;
    window.logGameStats = logGameStats;
    window.logEnemyTierDistribution = logEnemyTierDistribution;
}

console.log('✅ Game initialization loaded (with new systems)');
