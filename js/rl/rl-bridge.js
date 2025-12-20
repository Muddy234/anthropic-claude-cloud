// ============================================================================
// RL TRAINING BRIDGE - WebSocket Client for Python RL Training
// ============================================================================
//
// This module provides high-speed communication between the game and a Python
// RL training environment via WebSocket, replacing slow Selenium IPC.
//
// Architecture:
//   Game (JS) ←WebSocket→ Python (RL Agent)
//
// Performance: >1000 SPS vs ~10-20 SPS with Selenium
//
// Usage:
//   1. Start Python training server: python train.py --websocket
//   2. Load game in browser (this script auto-connects)
//   3. Training begins automatically when connected
//
// ============================================================================

(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================

    const CONFIG = {
        WS_URL: 'ws://localhost:8765',
        RECONNECT_DELAY: 1000,      // ms between reconnection attempts
        OBSERVATION_RATE: 50,        // ms between observation pushes (20 FPS)
        SYNC_MODE: 'event',          // 'event' (after action) or 'poll' (interval)
        DEBUG: false                 // Enable debug logging
    };

    // ========================================
    // STATE
    // ========================================

    let ws = null;
    let connected = false;
    let frameId = 0;
    let lastActionTime = 0;
    let enabled = true;

    // Action mapping
    const ACTION_MAP = {
        0: null,           // Wait/No-op
        1: 'ArrowUp',
        2: 'ArrowDown',
        3: 'ArrowLeft',
        4: 'ArrowRight',
        5: ' '             // Space - Attack/Interact
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

            // Send ready signal
            send({ type: 'ready', timestamp: Date.now() });

            // Send initial observation
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
                executeAction(data.action);
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

    function executeAction(action) {
        lastActionTime = Date.now();

        const key = ACTION_MAP[action];
        if (key !== null && key !== undefined) {
            simulateKeypress(key);
        }

        // Send observation after action is processed
        // Use requestAnimationFrame to sync with game render loop
        if (CONFIG.SYNC_MODE === 'event') {
            requestAnimationFrame(() => {
                // Wait one more frame for game state to update
                requestAnimationFrame(() => {
                    sendObservation();
                });
            });
        }
    }

    function simulateKeypress(key) {
        // Create and dispatch keydown event
        const keydownEvent = new KeyboardEvent('keydown', {
            key: key,
            code: key === ' ' ? 'Space' : key,
            keyCode: getKeyCode(key),
            which: getKeyCode(key),
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(keydownEvent);

        // Also trigger on canvas if it exists
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.dispatchEvent(keydownEvent);
        }

        // For movement, also update game.keys state directly if available
        if (typeof window.game !== 'undefined' && window.game.keys) {
            window.game.keys[key] = true;

            // Clear key after short delay (simulate keyup)
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
            ' ': 32
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
            default:
                log('Unknown command:', command);
        }
    }

    function resetGame() {
        // Try different reset methods
        if (typeof window.startNewGameDungeon === 'function') {
            window.startNewGameDungeon();
        } else if (typeof window.resetGame === 'function') {
            window.resetGame();
        } else if (window.game && window.game.state === 'dead') {
            // Refresh page as fallback
            location.reload();
        }

        // Send observation after reset delay
        setTimeout(() => sendObservation(), 500);
    }

    function startGame() {
        if (typeof window.startNewGameDungeon === 'function') {
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
        if (data.observation_rate) {
            CONFIG.OBSERVATION_RATE = data.observation_rate;
        }
        if (data.sync_mode) {
            CONFIG.SYNC_MODE = data.sync_mode;
        }
        if (data.debug !== undefined) {
            CONFIG.DEBUG = data.debug;
        }
    }

    // ========================================
    // OBSERVATION BUILDING
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
        // Safety check
        if (typeof window.game === 'undefined') {
            return null;
        }

        const g = window.game;
        const p = g.player;

        if (!p) {
            return {
                game_state: g.state || 'menu',
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
                inventory_value: 0
            };
        }

        // Grid parameters
        const R = 5;  // Radius (11x11 grid)
        const SIZE = 11;

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

        // Build channels
        for (let dy = -R; dy <= R; dy++) {
            for (let dx = -R; dx <= R; dx++) {
                const x = playerX + dx;
                const y = playerY + dy;
                const idx = (dy + R) * SIZE + (dx + R);

                // Bounds check
                if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight || !g.map[y]) {
                    geometry[idx] = 1.0;  // Out of bounds = wall
                    continue;
                }

                const tile = g.map[y][x];
                if (!tile) {
                    geometry[idx] = 1.0;
                    continue;
                }

                // CHANNEL 0: Geometry (walls = 1, floor = 0)
                if (tile.type === 'wall' || tile.type === 'void' || tile.type === 'interior_wall') {
                    geometry[idx] = 1.0;
                }

                // CHANNEL 1: Actors (enemy HP normalized 0-1)
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

                // CHANNEL 2: Loot (value heuristic 0-1)
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

                // Decorations (chests, shrines)
                if (g.decorations) {
                    const dec = g.decorations.find(d => d.x === x && d.y === y && d.interactable);
                    if (dec) {
                        loot[idx] = Math.max(loot[idx], 0.5);
                    }
                }

                // Extraction points
                if (g.extractionPoints) {
                    const ext = g.extractionPoints.find(e => e.x === x && e.y === y);
                    if (ext) {
                        loot[idx] = 1.0;  // High value for extraction
                    }
                }

                // CHANNEL 3: Hazards (danger level 0-1)
                if (tile.hazard) {
                    hazards[idx] = 1.0;
                }
                if (g.lavaTiles && g.lavaTiles.has) {
                    if (g.lavaTiles.has(`${x},${y}`)) {
                        hazards[idx] = 1.0;
                    }
                }
                if (g.lavaVents) {
                    const vent = g.lavaVents.find(v => v.x === x && v.y === y);
                    if (vent) {
                        hazards[idx] = 0.75;
                    }
                }
            }
        }

        // Compute enemy stats
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

        // Compute inventory value
        let inventoryValue = 0;
        if (p.inventory && Array.isArray(p.inventory)) {
            for (const item of p.inventory) {
                if (item) {
                    inventoryValue += item.value || item.price || item.sellPrice || 10;
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

        // Determine game state for FSM
        let gameState = g.state || 'unknown';
        if (p.hp <= 0) {
            gameState = 'dead';
        }

        return {
            game_state: gameState,
            geometry: geometry,
            actors: actors,
            loot: loot,
            hazards: hazards,
            hp: p.hp || 0,
            max_hp: p.maxHp || 100,
            gold: g.gold || 0,
            xp: xp,
            floor: g.floor || 1,
            player_x: playerX,
            player_y: playerY,
            in_combat: inCombat,
            enemy_count: enemyCount,
            nearest_enemy_dist: nearestDist,
            nearest_enemy_hp: nearestHp,
            inventory_value: inventoryValue
        };
    }

    // ========================================
    // POLLING MODE (optional)
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
        log('Initializing RL Bridge...');

        // Start WebSocket connection
        connect();

        // Start polling if configured
        if (CONFIG.SYNC_MODE === 'poll') {
            startPolling();
        }

        // Expose API for debugging
        window.RLBridge = {
            connect: connect,
            disconnect: () => { enabled = false; if (ws) ws.close(); },
            sendObservation: sendObservation,
            isConnected: () => connected,
            setDebug: (val) => { CONFIG.DEBUG = val; },
            getConfig: () => ({ ...CONFIG }),
            getFrameId: () => frameId
        };

        log('RL Bridge initialized. Waiting for Python server...');
    }

    // Wait for DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

console.log('[RL] rl-bridge.js loaded');
