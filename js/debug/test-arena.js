// ============================================================================
// TEST ARENA - Debug Testing Module
// ============================================================================
// Provides a safe testing environment for combat and monster mechanics
//
// Console Commands:
//   debug.arena()           - Teleport to test arena
//   debug.spawn('name')     - Spawn a monster by name
//   debug.spawn('name', 5)  - Spawn a monster at level 5
//   debug.spawnAll()        - Spawn one of each monster type
//   debug.clear()           - Clear all enemies from arena
//   debug.heal()            - Fully heal the player
//   debug.god()             - Toggle god mode (invincibility)
//   debug.list()            - List all available monster names
//   debug.setFloor(n)       - Set current floor (affects monster scaling)
// ============================================================================

const TestArena = {
    // Test arena room reference
    arenaRoom: null,
    arenaCreated: false,
    originalPosition: null,

    /**
     * Create the test arena room
     */
    createArena() {
        const arenaWidth = 25;
        const arenaHeight = 25;
        const arenaX = -100;  // Off the normal map
        const arenaY = -100;

        // Create arena room object
        this.arenaRoom = {
            id: 'test_arena',
            type: 'arena',
            x: arenaX,
            y: arenaY,
            width: arenaWidth,
            height: arenaHeight,
            floorX: arenaX + 1,
            floorY: arenaY + 1,
            floorWidth: arenaWidth - 2,
            floorHeight: arenaHeight - 2,
            element: 'physical',
            blob: { difficulty: 5 },
            isTestArena: true
        };

        // Ensure map array exists and is large enough
        if (!game.map) game.map = [];

        // Create arena tiles
        for (let y = arenaY; y < arenaY + arenaHeight; y++) {
            if (!game.map[y]) game.map[y] = [];
            for (let x = arenaX; x < arenaX + arenaWidth; x++) {
                // Border walls
                if (x === arenaX || x === arenaX + arenaWidth - 1 ||
                    y === arenaY || y === arenaY + arenaHeight - 1) {
                    game.map[y][x] = { type: 'wall', char: '#' };
                } else {
                    game.map[y][x] = { type: 'floor', char: '.', room: this.arenaRoom };
                }
            }
        }

        // Add to rooms array if it exists
        if (game.rooms && !game.rooms.includes(this.arenaRoom)) {
            game.rooms.push(this.arenaRoom);
        }

        this.arenaCreated = true;
        console.log('[TestArena] Arena created at', arenaX, arenaY);
    },

    /**
     * Teleport player to test arena
     */
    teleportToArena() {
        if (!this.arenaCreated) {
            this.createArena();
        }

        // Save original position for return
        this.originalPosition = {
            x: game.player.gridX,
            y: game.player.gridY
        };

        // Teleport to center of arena
        const centerX = this.arenaRoom.x + Math.floor(this.arenaRoom.width / 2);
        const centerY = this.arenaRoom.y + Math.floor(this.arenaRoom.height / 2);

        game.player.gridX = centerX;
        game.player.gridY = centerY;
        game.player.x = centerX;
        game.player.y = centerY;
        game.player.displayX = centerX;
        game.player.displayY = centerY;

        // Clear any enemies that might be in the arena
        this.clearEnemies();

        console.log('[TestArena] Teleported to arena at', centerX, centerY);
        console.log('[TestArena] Use debug.spawn("Monster Name") to spawn enemies');
        console.log('[TestArena] Use debug.list() to see available monsters');

        if (typeof addMessage === 'function') {
            addMessage('Teleported to Test Arena!');
        }

        return { x: centerX, y: centerY };
    },

    /**
     * Return to original position
     */
    returnFromArena() {
        if (this.originalPosition) {
            game.player.gridX = this.originalPosition.x;
            game.player.gridY = this.originalPosition.y;
            game.player.x = this.originalPosition.x;
            game.player.y = this.originalPosition.y;
            game.player.displayX = this.originalPosition.x;
            game.player.displayY = this.originalPosition.y;

            console.log('[TestArena] Returned to', this.originalPosition.x, this.originalPosition.y);
            if (typeof addMessage === 'function') {
                addMessage('Returned from Test Arena');
            }
        } else {
            console.warn('[TestArena] No original position saved');
        }
    },

    /**
     * Spawn a monster in the arena
     * @param {string} monsterName - Name of the monster to spawn
     * @param {number} level - Optional level override (default: current floor)
     * @param {number} offsetX - X offset from player (default: 3)
     * @param {number} offsetY - Y offset from player (default: 0)
     */
    spawnMonster(monsterName, level = null, offsetX = 3, offsetY = 0) {
        // Check if monster exists
        if (typeof MONSTER_DATA === 'undefined') {
            console.error('[TestArena] MONSTER_DATA not loaded');
            return null;
        }

        // Try to find the monster (case-insensitive partial match)
        let matchedName = null;
        const lowerInput = monsterName.toLowerCase();

        for (const name of Object.keys(MONSTER_DATA)) {
            if (name.toLowerCase() === lowerInput) {
                matchedName = name;
                break;
            }
            if (name.toLowerCase().includes(lowerInput)) {
                matchedName = name;
            }
        }

        if (!matchedName) {
            console.error(`[TestArena] Monster "${monsterName}" not found`);
            console.log('[TestArena] Available monsters:', Object.keys(MONSTER_DATA).join(', '));
            return null;
        }

        // Calculate spawn position
        const spawnX = game.player.gridX + offsetX;
        const spawnY = game.player.gridY + offsetY;

        // Override floor for level scaling if specified
        const originalFloor = game.floor;
        if (level !== null) {
            game.floor = level;
        }

        // Create the enemy
        let enemy = null;
        if (typeof createEnemy === 'function') {
            enemy = createEnemy(matchedName, spawnX, spawnY, this.arenaRoom || game.player.room);
        } else if (typeof spawnEnemy === 'function') {
            enemy = spawnEnemy(matchedName, spawnX, spawnY);
        }

        // Restore original floor
        if (level !== null) {
            game.floor = originalFloor;
            // Update the enemy's level to match what we wanted
            if (enemy) {
                enemy.level = level;
            }
        }

        if (enemy) {
            // Add to game enemies array
            if (!game.enemies) game.enemies = [];
            game.enemies.push(enemy);

            // Register with AI system
            if (typeof AIManager !== 'undefined' && typeof AIManager.registerEnemy === 'function') {
                AIManager.registerEnemy(enemy);
            }

            console.log(`[TestArena] Spawned ${matchedName} (Lv.${enemy.level}) at (${spawnX}, ${spawnY})`);
            console.log(`[TestArena] Stats: HP=${enemy.hp}/${enemy.maxHp}, STR=${enemy.str}, AGI=${enemy.agi}, INT=${enemy.int}`);

            if (typeof addMessage === 'function') {
                addMessage(`Spawned ${matchedName} (Lv.${enemy.level})!`);
            }

            return enemy;
        } else {
            console.error('[TestArena] Failed to create enemy');
            return null;
        }
    },

    /**
     * Spawn one of each monster type
     */
    spawnAllMonsters(level = null) {
        if (typeof MONSTER_DATA === 'undefined') {
            console.error('[TestArena] MONSTER_DATA not loaded');
            return;
        }

        const monsters = Object.keys(MONSTER_DATA);
        const gridSize = Math.ceil(Math.sqrt(monsters.length));
        let spawned = 0;

        monsters.forEach((name, i) => {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            const offsetX = (col - Math.floor(gridSize / 2)) * 2 + 3;
            const offsetY = (row - Math.floor(gridSize / 2)) * 2;

            const enemy = this.spawnMonster(name, level, offsetX, offsetY);
            if (enemy) spawned++;
        });

        console.log(`[TestArena] Spawned ${spawned}/${monsters.length} monsters`);
    },

    /**
     * Clear all enemies from the arena/game
     */
    clearEnemies() {
        if (!game.enemies) return;

        // Unregister from AI
        if (typeof AIManager !== 'undefined') {
            game.enemies.forEach(enemy => {
                if (typeof AIManager.unregisterEnemy === 'function') {
                    AIManager.unregisterEnemy(enemy);
                }
            });
        }

        const count = game.enemies.length;
        game.enemies = [];

        console.log(`[TestArena] Cleared ${count} enemies`);
        if (typeof addMessage === 'function') {
            addMessage(`Cleared ${count} enemies`);
        }
    },

    /**
     * Fully heal the player
     */
    healPlayer() {
        if (!game.player) return;

        game.player.hp = game.player.maxHp;
        game.player.mp = game.player.maxMp;

        // Clear negative status effects
        if (game.player.statusEffects) {
            game.player.statusEffects = game.player.statusEffects.filter(e =>
                !['bleed', 'poison', 'burn', 'slow', 'stun'].includes(e.type)
            );
        }

        console.log('[TestArena] Player healed to full HP/MP');
        if (typeof addMessage === 'function') {
            addMessage('Fully healed!');
        }
    },

    /**
     * Toggle god mode
     */
    toggleGodMode() {
        window.godMode = !window.godMode;
        console.log(`[TestArena] God mode: ${window.godMode ? 'ON' : 'OFF'}`);
        if (typeof addMessage === 'function') {
            addMessage(`God mode: ${window.godMode ? 'ENABLED' : 'DISABLED'}`);
        }
        return window.godMode;
    },

    /**
     * List all available monsters
     */
    listMonsters() {
        if (typeof MONSTER_DATA === 'undefined') {
            console.error('[TestArena] MONSTER_DATA not loaded');
            return [];
        }

        const monsters = Object.keys(MONSTER_DATA);
        console.log('[TestArena] Available monsters:');
        monsters.forEach(name => {
            const data = MONSTER_DATA[name];
            const tier = (typeof MONSTER_TIER_MAP !== 'undefined' && MONSTER_TIER_MAP[name]) || 'TIER_3';
            console.log(`  - ${name} (${tier}) - ${data.element}, ${data.attackType}`);
        });

        return monsters;
    },

    /**
     * Set the current floor level
     */
    setFloor(floor) {
        if (typeof floor !== 'number' || floor < 1) {
            console.error('[TestArena] Invalid floor number');
            return;
        }

        game.floor = floor;
        console.log(`[TestArena] Floor set to ${floor}`);
        console.log(`[TestArena] New monsters will spawn at Lv.${floor}`);

        if (typeof addMessage === 'function') {
            addMessage(`Floor set to ${floor}`);
        }
    }
};

// ============================================================================
// GLOBAL DEBUG INTERFACE
// ============================================================================

window.debug = window.debug || {};

// Arena commands
window.debug.arena = () => TestArena.teleportToArena();
window.debug.return = () => TestArena.returnFromArena();

// Monster commands
window.debug.spawn = (name, level) => TestArena.spawnMonster(name, level);
window.debug.spawnAt = (name, x, y, level) => TestArena.spawnMonster(name, level, x, y);
window.debug.spawnAll = (level) => TestArena.spawnAllMonsters(level);
window.debug.clear = () => TestArena.clearEnemies();
window.debug.list = () => TestArena.listMonsters();

// Player commands
window.debug.heal = () => TestArena.healPlayer();
window.debug.god = () => TestArena.toggleGodMode();
window.debug.godMode = () => TestArena.toggleGodMode();

// Game state commands
window.debug.setFloor = (n) => TestArena.setFloor(n);
window.debug.floor = (n) => TestArena.setFloor(n);

// Quick reference
window.debug.help = () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    TEST ARENA COMMANDS                        ║
╠══════════════════════════════════════════════════════════════╣
║  ARENA:                                                       ║
║    debug.arena()         - Teleport to test arena            ║
║    debug.return()        - Return to original location       ║
║                                                               ║
║  MONSTERS:                                                    ║
║    debug.spawn('name')   - Spawn monster (current floor lvl) ║
║    debug.spawn('name',5) - Spawn monster at level 5          ║
║    debug.spawnAll()      - Spawn all monster types           ║
║    debug.clear()         - Remove all enemies                ║
║    debug.list()          - Show available monsters           ║
║                                                               ║
║  PLAYER:                                                      ║
║    debug.heal()          - Full HP/MP restore                ║
║    debug.god()           - Toggle invincibility              ║
║                                                               ║
║  GAME STATE:                                                  ║
║    debug.setFloor(n)     - Set floor (affects scaling)       ║
╚══════════════════════════════════════════════════════════════╝
    `);
};

// Export
window.TestArena = TestArena;

console.log('[TestArena] Debug module loaded. Type debug.help() for commands.');
