// === js/core/main.js ===
// Main game loop - now orchestrated through SystemManager
// SURVIVAL EXTRACTION UPDATE: Added auto-save and village state support

// ============================================================================
// AUTO-SAVE TRACKING
// ============================================================================

let lastAutoSaveTime = 0;
let playtimeTracker = 0;  // Track playtime for stats

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

// Performance monitoring for lag diagnosis
const perfMonitor = {
    enabled: false,  // Set to true via console: perfMonitor.enabled = true
    frameCount: 0,
    slowFrames: 0,
    lastReport: 0,
    reportInterval: 3000, // Report every 3 seconds when enabled
    threshold: 50, // Log frames slower than 50ms

    check(dt, timestamp) {
        if (!this.enabled) return;

        this.frameCount++;
        if (dt > this.threshold) {
            this.slowFrames++;
            console.warn(`[Perf] Slow frame: ${dt.toFixed(1)}ms | Enemies: ${game.enemies?.length || 0} | Effects: ${typeof activeEffects !== 'undefined' ? activeEffects.length : 0} | Projectiles: ${game.projectiles?.length || 0} | Inventory: ${game.player?.inventory?.length || 0}`);
        }

        if (timestamp - this.lastReport > this.reportInterval) {
            console.log(`[Perf] ${this.frameCount} frames, ${this.slowFrames} slow (>${this.threshold}ms)`);
            this.frameCount = 0;
            this.slowFrames = 0;
            this.lastReport = timestamp;
        }
    }
};
window.perfMonitor = perfMonitor;

function update(dt) {
    // ========================================================================
    // STATE-BASED UPDATE ROUTING
    // ========================================================================

    switch (game.state) {
        case 'playing':
            updateDungeon(dt);
            break;

        case 'village':
            updateVillage(dt);
            break;

        case 'menu':
        case 'gameover':
        case 'victory':
            // These states don't need per-frame updates
            break;

        default:
            // For chest, dialogue, shop, etc. - still update some systems
            updatePausedState(dt);
            break;
    }

    // ========================================================================
    // PLAYTIME TRACKING (all states)
    // ========================================================================

    if (typeof persistentState !== 'undefined' && game.state !== 'menu') {
        playtimeTracker += dt;
        // Update stats every second
        if (playtimeTracker >= 1000) {
            persistentState.stats.playtime += Math.floor(playtimeTracker / 1000);
            playtimeTracker = playtimeTracker % 1000;
        }
    }

    // ========================================================================
    // AUTO-SAVE (during active runs)
    // ========================================================================

    if (typeof sessionState !== 'undefined' && sessionState.active) {
        lastAutoSaveTime += dt;
        const autoSaveInterval = (typeof SAVE_CONFIG !== 'undefined')
            ? SAVE_CONFIG.autoSaveInterval
            : 30000;

        if (lastAutoSaveTime >= autoSaveInterval) {
            if (typeof SaveManager !== 'undefined') {
                SaveManager.autoSave();
            }
            lastAutoSaveTime = 0;
        }
    }
}

// ============================================================================
// STATE-SPECIFIC UPDATE FUNCTIONS
// ============================================================================

/**
 * Update dungeon gameplay state
 */
function updateDungeon(dt) {
    // Debug info
    const aiStatus = typeof AIManager !== 'undefined' ? `AI: ${AIManager.ais ? AIManager.ais.size : 0}` : 'AI: OFF';
    const systemCount = typeof SystemManager !== 'undefined' ? SystemManager.count : 0;
    const effectCount = typeof activeEffects !== 'undefined' ? activeEffects.length : 0;

    // Show extraction status if available
    const extractionInfo = typeof sessionState !== 'undefined' && sessionState.active
        ? `Floor: ${sessionState.currentFloor}`
        : '';

    document.getElementById('debug').innerText =
        `${extractionInfo} | Enemies: ${game.enemies.length} | ${aiStatus} | Systems: ${systemCount} | DT: ${dt.toFixed(1)}ms | FX: ${effectCount}`;

    // === Run all registered systems in priority order ===
    if (typeof SystemManager !== 'undefined') {
        SystemManager.updateAll(dt);
    }
}

/**
 * Update village hub state
 */
function updateVillage(dt) {
    // Debug info
    document.getElementById('debug').innerText = `Village | NPCs: ${villageState?.npcs?.length || 0} | State: ${game.state}`;

    // Update dialogue UI if active
    if (typeof DialogueUI !== 'undefined' && DialogueUI.active) {
        DialogueUI.update(dt);
        return;  // Don't process movement during dialogue
    }

    // Update NPC interaction indicators
    if (typeof villageState !== 'undefined' && villageState && villageState.npcs && villageState.player) {
        const interactionRange = 1.5;
        villageState.npcs.forEach(npc => {
            const dx = npc.x - villageState.player.x;
            const dy = npc.y - villageState.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            npc.showInteraction = dist <= interactionRange;
        });
    }
}

/**
 * Update during paused/UI states (chest, dialogue, shop, etc.)
 */
function updatePausedState(dt) {
    // Limited updates during UI states
    // Animations might still run, but combat/AI paused
    document.getElementById('debug').innerText = `State: ${game.state}`;
}

let lastTime = 0;
function loop(timestamp) {
    if (!lastTime) {
        lastTime = timestamp;
        requestAnimationFrame(loop);
        return;
    }

    const dt = timestamp - lastTime;
    lastTime = timestamp;

    // Performance monitoring
    perfMonitor.check(dt, timestamp);

    update(dt);
    render();

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

console.log('✅ Main loop loaded. Enable perf monitoring with: perfMonitor.enabled = true');
