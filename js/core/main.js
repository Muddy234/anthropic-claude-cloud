// === js/core/main.js ===
// Main game loop - now orchestrated through SystemManager

function update(dt) {
    if (game.state !== 'playing') return;

    // Debug info
    const aiStatus = typeof AIManager !== 'undefined' ? `AI: ${AIManager.ais ? AIManager.ais.size : 0}` : 'AI: OFF';
    const systemCount = typeof SystemManager !== 'undefined' ? SystemManager.count : 0;
    document.getElementById('debug').innerText =
        `Enemies: ${game.enemies.length} | ${aiStatus} | Systems: ${systemCount} | DT: ${dt.toFixed(1)}ms | Shift: ${game.shiftActive ? 'ACTIVE' : 	'INACTIVE'}`;

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

    update(dt);
    render();

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
