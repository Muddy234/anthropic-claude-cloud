// === js/core/main.js ===
// Main game loop - now orchestrated through SystemManager

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
    if (game.state !== 'playing') return;

    // Debug info
    const aiStatus = typeof AIManager !== 'undefined' ? `AI: ${AIManager.ais ? AIManager.ais.size : 0}` : 'AI: OFF';
    const systemCount = typeof SystemManager !== 'undefined' ? SystemManager.count : 0;
    const effectCount = typeof activeEffects !== 'undefined' ? activeEffects.length : 0;
    document.getElementById('debug').innerText =
        `Enemies: ${game.enemies.length} | ${aiStatus} | Systems: ${systemCount} | DT: ${dt.toFixed(1)}ms | FX: ${effectCount} | Shift: ${game.shiftActive ? 'ACTIVE' : 'INACTIVE'}`;

    // === Run all registered systems in priority order ===
    if (typeof SystemManager !== 'undefined') {
        SystemManager.updateAll(dt);
    }
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
