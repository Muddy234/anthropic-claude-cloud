const shiftScenarios = {
    'magma_collapse': {
        name: "Protocol: MELTDOWN",
        description: "Seismic instability detected! The outer edges are collapsing into the Chasm!",
        init: function (game) {
            const entrance = game.rooms[0];
            game.exitPosition = { x: entrance.x + 2, y: entrance.y + 2 };
            game.map[game.exitPosition.y][game.exitPosition.x] = { type: 'exit', discovered: true, room: entrance };
            addMessage("THE SHIFT HAS BEGUN! ESCAPE TO THE ENTRANCE!");

            // Calculate distance from center to corner for the starting radius
            const cx = GRID_WIDTH / 2;
            const cy = GRID_HEIGHT / 2;
            const maxDist = Math.sqrt(cx * cx + cy * cy);

            // Timer: 0.5s, Step: 1 tile. This doubles the speed (approx 56s to clear).
            game.shiftState = { timer: 0.5, maxTimer: 0.5, currentRadius: maxDist, stepSize: 1, active: true };
        },
        update: function (game, dt) {
            if (!game.shiftState.active) return;
            game.shiftState.timer -= dt / 1000;

            if (game.shiftState.timer <= 0) {
                game.shiftState.timer = game.shiftState.maxTimer;
                game.shiftState.currentRadius -= game.shiftState.stepSize;

                if (game.shiftState.currentRadius % 10 === 0) {
                    addMessage(`WARNING: SECTOR COLLAPSE! RADIUS: ${Math.floor(game.shiftState.currentRadius)}`);
                }

                const cx = GRID_WIDTH / 2;
                const cy = GRID_HEIGHT / 2;
                const rSq = game.shiftState.currentRadius ** 2;

                // Iterate through all tiles to check if they are outside the safe zone
                for (let y = 0; y < GRID_HEIGHT; y++) {
                    for (let x = 0; x < GRID_WIDTH; x++) {
                        const distSq = (x - cx) ** 2 + (y - cy) ** 2;
                        if (distSq > rSq) {
                            const tile = game.map[y][x];
                            if (tile.type === 'floor' || tile.type === 'doorway') {
                                tile.type = 'lava';
                                game.lavaTiles.add(`${x},${y}`);
                            }
                        }
                    }
                }

                // Check if player is burning
                const pDistSq = (game.player.x - cx) ** 2 + (game.player.y - cy) ** 2;
                if (pDistSq > rSq) {
                    game.player.hp -= 20;
                    addMessage("YOU ARE BURNING! RUN!");
                    if (game.player.hp <= 0) game.state = 'gameover';
                }
            }
        }
    }
};

function triggerShift(shiftId) {
    if (game.shiftActive) return;
    const scenario = shiftScenarios[shiftId];
    if (!scenario) return;
    game.shiftActive = true;
    game.activeShift = scenario;
    scenario.init(game);
    addMessage(scenario.name);
    addMessage(scenario.description);
}
// ============================================================================
// SYSTEM MANAGER REGISTRATION - Add to end of shift-system.js
// ============================================================================

const ShiftSystemDef = {
    name: 'shift-system',
    
    update(dt) {
        // Update active shift scenario
        if (game.shiftActive && game.activeShift && game.activeShift.update) {
            game.activeShift.update(game, dt);
        }
    },
    
    cleanup() {
        // Reset shift state on floor transition
        game.shiftMeter = 0;
        game.shiftActive = false;
        game.activeShift = null;
    }
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('shift-system', ShiftSystemDef, 80);
} else {
    console.warn('⚠️ SystemManager not found - shift-system running standalone');
}

console.log('✅ Shift system loaded');
