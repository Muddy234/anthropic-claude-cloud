const shiftScenarios = {
    'magma_collapse': {
        name: "Protocol: MELTDOWN",
        description: "Seismic instability detected! The outer edges are collapsing into the Chasm!",
        init: function (game) {
            // Find the farthest room from the entrance
            const entrance = game.rooms[0];
            let farthestRoom = entrance;
            let maxDist = 0;

            for (const room of game.rooms) {
                if (room === entrance) continue;
                const dist = Math.abs(room.x - entrance.x) + Math.abs(room.y - entrance.y);
                if (dist > maxDist) {
                    maxDist = dist;
                    farthestRoom = room;
                }
            }

            // Place exit in the center of the farthest room
            const exitX = farthestRoom.floorX + Math.floor(farthestRoom.floorWidth / 2);
            const exitY = farthestRoom.floorY + Math.floor(farthestRoom.floorHeight / 2);
            game.exitPosition = { x: exitX, y: exitY };
            game.map[exitY][exitX] = { type: 'exit', discovered: true, room: farthestRoom };
            addMessage("THE SHIFT HAS BEGUN! REACH THE EXIT!");

            // Calculate max distance from exit to any corner for the starting radius
            const corners = [
                { x: 0, y: 0 },
                { x: GRID_WIDTH, y: 0 },
                { x: 0, y: GRID_HEIGHT },
                { x: GRID_WIDTH, y: GRID_HEIGHT }
            ];
            let startRadius = 0;
            for (const corner of corners) {
                const d = Math.sqrt((corner.x - exitX) ** 2 + (corner.y - exitY) ** 2);
                if (d > startRadius) startRadius = d;
            }

            // Store exit position as lava center point
            game.shiftState = {
                timer: 0.5,
                maxTimer: 0.5,
                currentRadius: startRadius,
                stepSize: 1,
                active: true,
                centerX: exitX,
                centerY: exitY
            };
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

                // Lava flows towards the EXIT position
                const cx = game.shiftState.centerX;
                const cy = game.shiftState.centerY;
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
                    addMessage("YOU ARE BURNING! RUN TO THE EXIT!");
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
