// ============================================================================
// RL TRAINING BRIDGE - WebSocket Client for Python RL Training
// ============================================================================
//
// This module provides high-speed communication between the game and a Python
// RL training environment via WebSocket, replacing slow Selenium IPC.
//
// Features:
//   - High-speed WebSocket communication (>1000 SPS)
//   - Multi-channel spatial observations
//   - Egocentric feature normalization (translational invariance)
//   - Potion/inventory state tracking
//   - Walkable map for A* pathfinding support
//
// ============================================================================

(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================

    const CONFIG = {
        WS_URL: 'ws://localhost:8765',
        RECONNECT_DELAY: 1000,
        OBSERVATION_RATE: 50,
        SYNC_MODE: 'event',
        DEBUG: false,
        // Egocentric observation settings
        MAX_ENEMIES_TRACKED: 10,
        MAX_LOOT_TRACKED: 10,
        OBSERVATION_RADIUS: 5,  // 11x11 grid
        // Bot save system
        BOT_SAVE_SLOT: 2,       // Dedicated slot for bot (0-2, slot 2 = bot)
        USE_PERSISTENT_SAVE: true  // Enable game save integration
    };

    // ========================================
    // STATE
    // ========================================

    let ws = null;
    let connected = false;
    let frameId = 0;
    let lastActionTime = 0;
    let enabled = true;

    // Action mapping (extended for semantic actions)
    const PRIMITIVE_ACTION_MAP = {
        0: null,           // Wait/No-op
        1: 'ArrowUp',
        2: 'ArrowDown',
        3: 'ArrowLeft',
        4: 'ArrowRight',
        5: ' ',            // Space - Attack/Interact
        6: '3'             // Hotkey 3 - Use Potion
    };

    // ========================================
    // WEBSOCKET CONNECTION
    // ========================================

    function connect() {
        if (!enabled) return;

        try {
            ws = new WebSocket(CONFIG.WS_URL);
        } catch (e) {
            log('WebSocket creation failed:', e);
            scheduleReconnect();
            return;
        }

        ws.onopen = function() {
            log('Connected to Python RL server');
            connected = true;
            send({ type: 'ready', timestamp: Date.now() });
            setTimeout(() => sendObservation(), 100);
        };

        ws.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data);
            } catch (e) {
                log('Message parse error:', e);
            }
        };

        ws.onclose = function(event) {
            log('Disconnected from Python server', event.code);
            connected = false;
            ws = null;
            scheduleReconnect();
        };

        ws.onerror = function(err) {
            log('WebSocket error:', err);
        };
    }

    function scheduleReconnect() {
        if (enabled) {
            setTimeout(connect, CONFIG.RECONNECT_DELAY);
        }
    }

    function send(data) {
        if (connected && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
            return true;
        }
        return false;
    }

    function log(...args) {
        if (CONFIG.DEBUG) {
            console.log('[RL Bridge]', ...args);
        }
    }

    // ========================================
    // MESSAGE HANDLING
    // ========================================

    function handleMessage(data) {
        switch (data.type) {
            case 'action':
                executeAction(data.action, data.action_type);
                break;
            case 'command':
                executeCommand(data.command, data);
                break;
            case 'config':
                updateConfig(data);
                break;
            default:
                log('Unknown message type:', data.type);
        }
    }

    function executeAction(action, actionType = 'primitive') {
        lastActionTime = Date.now();

        // Handle primitive actions
        const key = PRIMITIVE_ACTION_MAP[action];
        if (key !== null && key !== undefined) {
            simulateKeypress(key);
        }

        // Send observation after action is processed
        if (CONFIG.SYNC_MODE === 'event') {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    sendObservation();
                });
            });
        }
    }

    function simulateKeypress(key) {
        const keydownEvent = new KeyboardEvent('keydown', {
            key: key,
            code: key === ' ' ? 'Space' : (key.startsWith('Arrow') ? key : `Digit${key}`),
            keyCode: getKeyCode(key),
            which: getKeyCode(key),
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(keydownEvent);

        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.dispatchEvent(keydownEvent);
        }

        if (typeof window.game !== 'undefined' && window.game.keys) {
            window.game.keys[key] = true;
            setTimeout(() => {
                if (window.game.keys) {
                    window.game.keys[key] = false;
                }
            }, 50);
        }
    }

    function getKeyCode(key) {
        const codes = {
            'ArrowUp': 38,
            'ArrowDown': 40,
            'ArrowLeft': 37,
            'ArrowRight': 39,
            ' ': 32,
            '1': 49,
            '2': 50,
            '3': 51,
            '4': 52
        };
        return codes[key] || 0;
    }

    function executeCommand(command, data) {
        log('Executing command:', command);

        switch (command) {
            case 'reset':
                resetGame();
                break;
            case 'start':
                startGame();
                break;
            case 'pause':
                pauseGame();
                break;
            case 'resume':
                resumeGame();
                break;
            case 'save':
                saveGame();
                break;
            case 'load':
                loadGame();
                break;
            case 'get_save_info':
                sendSaveInfo();
                break;
            default:
                log('Unknown command:', command);
        }
    }

    // ========================================
    // GAME SAVE INTEGRATION
    // ========================================

    function ensureBotSaveExists() {
        /**
         * Ensure the bot has a save file. Creates one if needed.
         */
        if (typeof SaveManager === 'undefined') {
            log('SaveManager not available');
            return false;
        }

        const slot = CONFIG.BOT_SAVE_SLOT;
        if (!SaveManager.slotExists(slot)) {
            log('Creating new bot save in slot', slot);
            SaveManager.createNewGame(slot);
        }
        return true;
    }

    function loadGame() {
        /**
         * Load the bot's save file and go to village.
         */
        if (!CONFIG.USE_PERSISTENT_SAVE) {
            log('Persistent saves disabled');
            return false;
        }

        if (typeof SaveManager === 'undefined') {
            log('SaveManager not available');
            return false;
        }

        ensureBotSaveExists();

        const slot = CONFIG.BOT_SAVE_SLOT;
        const result = SaveManager.applyLoad(slot);

        if (result && result.success) {
            log('Bot save loaded from slot', slot);
            // Go to village after loading
            if (typeof goToVillage === 'function') {
                goToVillage();
            } else if (window.game) {
                window.game.state = 'village';
            }
            return true;
        }

        log('Failed to load bot save');
        return false;
    }

    function saveGame() {
        /**
         * Save the bot's current progress.
         */
        if (!CONFIG.USE_PERSISTENT_SAVE) return false;

        if (typeof SaveManager === 'undefined') {
            log('SaveManager not available');
            return false;
        }

        const slot = CONFIG.BOT_SAVE_SLOT;
        const result = SaveManager.save(slot);
        log('Bot save saved to slot', slot, result);
        return result;
    }

    function sendSaveInfo() {
        /**
         * Send save file info to Python for progress tracking.
         */
        if (typeof SaveManager === 'undefined') {
            send({ type: 'save_info', payload: null });
            return;
        }

        const slot = CONFIG.BOT_SAVE_SLOT;
        const slots = SaveManager.getSaveSlots();
        const botSlot = slots.find(s => s.slot === slot);

        // Get persistent state for detailed info
        let persistentState = null;
        if (SaveManager.slotExists(slot)) {
            const saveData = SaveManager.load(slot);
            if (saveData) {
                persistentState = {
                    bank_gold: saveData.persistent?.bank?.gold || 0,
                    bank_items: saveData.persistent?.bank?.items?.length || 0,
                    total_runs: saveData.persistent?.stats?.totalRuns || 0,
                    extractions: saveData.persistent?.stats?.successfulExtractions || 0,
                    deaths: saveData.persistent?.stats?.deaths || 0,
                    deepest_floor: saveData.persistent?.stats?.deepestFloor || 1,
                    playtime_minutes: (saveData.persistent?.stats?.playtime || 0) / 60000,
                    skills: saveData.persistent?.skills || {},
                    unlocked_floors: saveData.persistent?.shortcuts?.unlockedFloors || [1],
                    world_state: saveData.persistent?.worldState || 1,
                    has_death_drop: !!saveData.persistent?.deathDrop
                };
            }
        }

        send({
            type: 'save_info',
            payload: {
                slot: slot,
                exists: botSlot?.exists || false,
                metadata: botSlot || null,
                persistent: persistentState
            }
        });
    }

    function resetGame() {
        /**
         * Reset for a new episode:
         * 1. Save current progress (if in dungeon and alive, extraction; if dead, death)
         * 2. Load bot's save
         * 3. Start a new dungeon run from village
         */
        const g = window.game;
        const p = g?.player;

        // Handle end of previous run
        if (CONFIG.USE_PERSISTENT_SAVE && typeof SessionManager !== 'undefined') {
            if (g && g.state === 'playing') {
                // Still in dungeon - treat as extraction (bot is resetting, save progress)
                if (p && p.hp > 0) {
                    log('Bot extracting (reset during run)');
                    SessionManager.extractionSuccess();
                }
            } else if (g && g.state === 'dead') {
                // Already dead - SessionManager.playerDeath should have been called
                log('Bot died, save should already be updated');
            }

            // Save the game
            saveGame();
        }

        // Start new run
        if (CONFIG.USE_PERSISTENT_SAVE) {
            // Load save and start from village
            loadGame();

            // Wait for village to load, then start dungeon run
            setTimeout(() => {
                startDungeonRun();
            }, 300);
        } else {
            // Legacy behavior - just start new game
            if (typeof window.startNewGameDungeon === 'function') {
                window.startNewGameDungeon();
            } else if (typeof window.resetGame === 'function') {
                window.resetGame();
            } else if (g && g.state === 'dead') {
                location.reload();
            }
        }

        setTimeout(() => sendObservation(), 500);
    }

    function startDungeonRun() {
        /**
         * Start a new dungeon run from the village.
         * Uses SessionManager if available.
         */
        if (typeof SessionManager !== 'undefined' && typeof SessionManager.startRun === 'function') {
            // Get starting floor (use deepest unlocked shortcut)
            let startFloor = 1;
            if (typeof SaveManager !== 'undefined') {
                const slot = CONFIG.BOT_SAVE_SLOT;
                const saveData = SaveManager.load(slot);
                if (saveData?.persistent?.shortcuts?.unlockedFloors) {
                    const floors = saveData.persistent.shortcuts.unlockedFloors;
                    startFloor = Math.max(...floors);
                    log('Starting from floor', startFloor, '(unlocked:', floors, ')');
                }
            }

            // Get bank gold for starting loadout
            let startGold = 0;
            if (window.game?.bank?.gold) {
                // Use some gold from bank for the run
                startGold = Math.min(window.game.bank.gold, 100);
            }

            // Start the run
            SessionManager.startRun(startFloor, null, startGold);
            log('Started dungeon run on floor', startFloor);
        } else if (typeof window.startNewGameDungeon === 'function') {
            window.startNewGameDungeon();
        }
    }

    function startGame() {
        if (CONFIG.USE_PERSISTENT_SAVE) {
            loadGame();
            setTimeout(() => startDungeonRun(), 300);
        } else if (typeof window.startNewGameDungeon === 'function') {
            window.startNewGameDungeon();
        }
    }

    function pauseGame() {
        if (window.game) {
            window.game._rlPaused = true;
        }
    }

    function resumeGame() {
        if (window.game) {
            window.game._rlPaused = false;
        }
    }

    function updateConfig(data) {
        if (data.observation_rate) CONFIG.OBSERVATION_RATE = data.observation_rate;
        if (data.sync_mode) CONFIG.SYNC_MODE = data.sync_mode;
        if (data.debug !== undefined) CONFIG.DEBUG = data.debug;
    }

    // ========================================
    // OBSERVATION BUILDING (with Egocentric Features)
    // ========================================

    function sendObservation() {
        if (!connected) return;

        const obs = buildObservation();
        if (obs) {
            obs.frame_id = ++frameId;
            obs.timestamp = Date.now();
            send({ type: 'observation', payload: obs });
        }
    }

    function buildObservation() {
        if (typeof window.game === 'undefined') {
            return null;
        }

        const g = window.game;
        const p = g.player;

        if (!p) {
            return buildEmptyObservation(g);
        }

        // Grid parameters
        const R = CONFIG.OBSERVATION_RADIUS;
        const SIZE = R * 2 + 1;  // 11x11

        // Player position
        const playerX = Math.floor(p.gridX ?? p.x ?? 0);
        const playerY = Math.floor(p.gridY ?? p.y ?? 0);

        // Map dimensions
        const mapHeight = g.map ? g.map.length : 0;
        const mapWidth = (g.map && g.map[0]) ? g.map[0].length : 0;

        // Multi-channel arrays
        const geometry = new Array(SIZE * SIZE).fill(0);
        const actors = new Array(SIZE * SIZE).fill(0);
        const loot = new Array(SIZE * SIZE).fill(0);
        const hazards = new Array(SIZE * SIZE).fill(0);

        // Build spatial channels
        for (let dy = -R; dy <= R; dy++) {
            for (let dx = -R; dx <= R; dx++) {
                const x = playerX + dx;
                const y = playerY + dy;
                const idx = (dy + R) * SIZE + (dx + R);

                if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight || !g.map[y]) {
                    geometry[idx] = 1.0;
                    continue;
                }

                const tile = g.map[y][x];
                if (!tile) {
                    geometry[idx] = 1.0;
                    continue;
                }

                // CHANNEL 0: Geometry
                if (tile.type === 'wall' || tile.type === 'void' || tile.type === 'interior_wall') {
                    geometry[idx] = 1.0;
                }

                // CHANNEL 1: Actors
                if (g.enemies) {
                    const enemy = g.enemies.find(e => {
                        const ex = Math.floor(e.gridX ?? e.x);
                        const ey = Math.floor(e.gridY ?? e.y);
                        return ex === x && ey === y && e.hp > 0;
                    });
                    if (enemy) {
                        const maxHp = enemy.maxHp || enemy.stats?.maxHp || 100;
                        actors[idx] = Math.min(1.0, enemy.hp / maxHp);
                    }
                }

                // CHANNEL 2: Loot
                if (g.groundLoot) {
                    const item = g.groundLoot.find(i => {
                        const ix = Math.floor(i.x ?? i.gridX);
                        const iy = Math.floor(i.y ?? i.gridY);
                        return ix === x && iy === y;
                    });
                    if (item) {
                        const value = item.value || item.price || item.sellPrice || 10;
                        loot[idx] = Math.min(1.0, value / 100);
                    }
                }

                if (g.decorations) {
                    const dec = g.decorations.find(d => d.x === x && d.y === y && d.interactable);
                    if (dec) loot[idx] = Math.max(loot[idx], 0.5);
                }

                if (g.extractionPoints) {
                    const ext = g.extractionPoints.find(e => e.x === x && e.y === y);
                    if (ext) loot[idx] = 1.0;
                }

                // CHANNEL 3: Hazards
                if (tile.hazard) hazards[idx] = 1.0;
                if (g.lavaTiles && g.lavaTiles.has && g.lavaTiles.has(`${x},${y}`)) hazards[idx] = 1.0;
                if (g.lavaVents) {
                    const vent = g.lavaVents.find(v => v.x === x && v.y === y);
                    if (vent) hazards[idx] = 0.75;
                }
            }
        }

        // ========================================
        // EGOCENTRIC FEATURES (Translational Invariance)
        // ========================================

        // Enemies as relative deltas (dx, dy, hp_ratio)
        const enemiesEgocentric = [];
        if (g.enemies) {
            const sortedEnemies = g.enemies
                .filter(e => e.hp > 0)
                .map(e => {
                    const ex = (e.gridX ?? e.x) - playerX;
                    const ey = (e.gridY ?? e.y) - playerY;
                    const maxHp = e.maxHp || e.stats?.maxHp || 100;
                    return {
                        dx: ex,
                        dy: ey,
                        hp_ratio: e.hp / maxHp,
                        dist: Math.abs(ex) + Math.abs(ey)
                    };
                })
                .sort((a, b) => a.dist - b.dist)
                .slice(0, CONFIG.MAX_ENEMIES_TRACKED);

            for (const e of sortedEnemies) {
                enemiesEgocentric.push({
                    dx: e.dx,
                    dy: e.dy,
                    hp_ratio: e.hp_ratio
                });
            }
        }

        // Loot as relative deltas (dx, dy, value)
        const lootEgocentric = [];
        if (g.groundLoot) {
            const sortedLoot = g.groundLoot
                .map(i => {
                    const ix = (i.x ?? i.gridX) - playerX;
                    const iy = (i.y ?? i.gridY) - playerY;
                    const value = i.value || i.price || i.sellPrice || 10;
                    return {
                        dx: ix,
                        dy: iy,
                        value: Math.min(1.0, value / 100),
                        dist: Math.abs(ix) + Math.abs(iy)
                    };
                })
                .sort((a, b) => a.dist - b.dist)
                .slice(0, CONFIG.MAX_LOOT_TRACKED);

            for (const l of sortedLoot) {
                lootEgocentric.push({
                    dx: l.dx,
                    dy: l.dy,
                    value: l.value
                });
            }
        }

        // Extraction point as relative delta
        let extractionEgocentric = null;
        if (g.extractionPoints && g.extractionPoints.length > 0) {
            const ext = g.extractionPoints[0];
            extractionEgocentric = {
                dx: ext.x - playerX,
                dy: ext.y - playerY
            };
        }

        // ========================================
        // INVENTORY / POTION STATE
        // ========================================

        let hasPotion = false;
        let potionCount = 0;
        let inventoryValue = 0;

        if (p.inventory && Array.isArray(p.inventory)) {
            for (const item of p.inventory) {
                if (!item) continue;

                inventoryValue += item.value || item.price || item.sellPrice || 10;

                // Check for healing potions
                if (item.type === 'potion' || item.type === 'consumable') {
                    if (item.effect === 'heal' || item.name?.toLowerCase().includes('heal') ||
                        item.name?.toLowerCase().includes('health') ||
                        item.name?.toLowerCase().includes('potion')) {
                        hasPotion = true;
                        potionCount += item.count || 1;
                    }
                }
            }
        }

        // Check assigned consumables (hotkey 3)
        if (p.assignedConsumables && p.assignedConsumables.slot3) {
            hasPotion = true;
        }

        // ========================================
        // COMBAT & ENEMY STATS
        // ========================================

        let enemyCount = 0;
        let nearestDist = 999;
        let nearestHp = 0;

        if (g.enemies) {
            for (const e of g.enemies) {
                if (e.hp <= 0) continue;
                enemyCount++;
                const ex = e.gridX ?? e.x;
                const ey = e.gridY ?? e.y;
                const dist = Math.abs(ex - playerX) + Math.abs(ey - playerY);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestHp = e.hp;
                }
            }
        }

        // Check combat state
        let inCombat = false;
        if (p.combat && p.combat.isInCombat) {
            inCombat = true;
        } else if (p.inCombat) {
            inCombat = true;
        }

        // Get XP
        let xp = 0;
        if (p.xp !== undefined) {
            xp = p.xp;
        } else if (p.stats && p.stats.xp !== undefined) {
            xp = p.stats.xp;
        }

        // Determine game state
        let gameState = g.state || 'unknown';
        if (p.hp <= 0) {
            gameState = 'dead';
        }

        // ========================================
        // BUILD WALKABLE MAP FOR A* (optional, sent on request)
        // ========================================

        // For efficiency, only send walkable map if map is small
        // or if specifically requested. Here we send a simplified version.
        let walkable = null;
        if (mapHeight <= 100 && mapWidth <= 100) {
            walkable = [];
            for (let y = 0; y < mapHeight; y++) {
                for (let x = 0; x < mapWidth; x++) {
                    const tile = g.map[y]?.[x];
                    if (!tile || tile.type === 'wall' || tile.type === 'void' || tile.type === 'interior_wall') {
                        walkable.push(false);
                    } else {
                        walkable.push(true);
                    }
                }
            }
        }

        // ========================================
        // PERSISTENT SAVE INFO (for progression tracking)
        // ========================================

        let saveInfo = null;
        if (CONFIG.USE_PERSISTENT_SAVE && typeof SaveManager !== 'undefined') {
            const slot = CONFIG.BOT_SAVE_SLOT;
            const saveData = SaveManager.load(slot);
            if (saveData?.persistent) {
                saveInfo = {
                    bank_gold: saveData.persistent.bank?.gold || 0,
                    bank_items: saveData.persistent.bank?.items?.length || 0,
                    total_runs: saveData.persistent.stats?.totalRuns || 0,
                    extractions: saveData.persistent.stats?.successfulExtractions || 0,
                    deaths: saveData.persistent.stats?.deaths || 0,
                    deepest_floor: saveData.persistent.stats?.deepestFloor || 1,
                    unlocked_floors: saveData.persistent.shortcuts?.unlockedFloors || [1],
                    skills: Object.keys(saveData.persistent.skills || {}).length
                };
            }
        }

        // ========================================
        // RETURN OBSERVATION
        // ========================================

        return {
            game_state: gameState,

            // Spatial channels
            geometry: geometry,
            actors: actors,
            loot: loot,
            hazards: hazards,

            // Player stats
            hp: p.hp || 0,
            max_hp: p.maxHp || 100,
            gold: g.gold || 0,
            xp: xp,
            floor: g.floor || 1,
            player_x: playerX,
            player_y: playerY,

            // Combat info
            in_combat: inCombat,
            enemy_count: enemyCount,
            nearest_enemy_dist: nearestDist,
            nearest_enemy_hp: nearestHp,

            // Inventory
            inventory_value: inventoryValue,
            has_potion: hasPotion,
            potion_count: potionCount,

            // Egocentric features (translational invariance)
            enemies_egocentric: enemiesEgocentric,
            loot_egocentric: lootEgocentric,
            extraction_egocentric: extractionEgocentric,

            // Persistent save info (progression tracking)
            save_info: saveInfo,

            // Walkable map for A* (if small enough)
            walkable: walkable,
            map_width: mapWidth,
            map_height: mapHeight
        };
    }

    function buildEmptyObservation(g) {
        return {
            game_state: g?.state || 'menu',
            geometry: new Array(121).fill(1),
            actors: new Array(121).fill(0),
            loot: new Array(121).fill(0),
            hazards: new Array(121).fill(0),
            hp: 0,
            max_hp: 100,
            gold: 0,
            xp: 0,
            floor: 1,
            player_x: 0,
            player_y: 0,
            in_combat: false,
            enemy_count: 0,
            nearest_enemy_dist: 999,
            nearest_enemy_hp: 0,
            inventory_value: 0,
            has_potion: false,
            potion_count: 0,
            enemies_egocentric: [],
            loot_egocentric: [],
            extraction_egocentric: null,
            save_info: null,
            walkable: null,
            map_width: 0,
            map_height: 0
        };
    }

    // ========================================
    // POLLING MODE
    // ========================================

    function startPolling() {
        setInterval(() => {
            if (CONFIG.SYNC_MODE === 'poll' && connected) {
                if (window.game && window.game.state === 'playing') {
                    sendObservation();
                }
            }
        }, CONFIG.OBSERVATION_RATE);
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    function init() {
        log('Initializing RL Bridge with Egocentric Features...');

        connect();

        if (CONFIG.SYNC_MODE === 'poll') {
            startPolling();
        }

        // Expose API
        window.RLBridge = {
            connect: connect,
            disconnect: () => { enabled = false; if (ws) ws.close(); },
            sendObservation: sendObservation,
            isConnected: () => connected,
            setDebug: (val) => { CONFIG.DEBUG = val; },
            getConfig: () => ({ ...CONFIG }),
            getFrameId: () => frameId,
            // New methods
            getEgocentricEnemies: () => buildObservation()?.enemies_egocentric || [],
            getEgocentricLoot: () => buildObservation()?.loot_egocentric || []
        };

        log('RL Bridge initialized with egocentric features.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

console.log('[RL] rl-bridge.js loaded (egocentric features enabled)');
