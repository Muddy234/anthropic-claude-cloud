const shiftScenarios = {
    'magma_collapse': {
        name: "Protocol: MELTDOWN",
        description: "Seismic instability detected! The outer edges are collapsing into the Chasm!",

        // Floor lore - displayed in the shift overlay
        lore: {
            title: "The Molten Depths",
            paragraphs: [
                "Beneath the ancient fortress lies a network of tunnels carved by primordial magma flows. The dwarves who once mined these depths discovered something far more dangerous than ore—a sleeping fire that yearns to reclaim its domain.",
                "The Chasm's heart beats with volcanic fury. Every ten minutes, the pressure builds until the outer tunnels collapse into rivers of molten rock, forcing everything within toward the center.",
                "Those who have survived speak of treasures left behind by fleeing miners, now guarded by creatures born of flame and shadow. The desperate make their fortune here. The foolish become ash."
            ]
        },

        // Mechanics description for overlay
        mechanics: {
            title: "The Meltdown",
            description: "When the countdown reaches zero, lava begins consuming the dungeon from the edges inward. You have 90 seconds to reach the exit before everything is consumed.",
            details: [
                "Lava flows inward toward the exit",
                "Standing in lava deals 20 damage per tick",
                "All enemies become alert and aggressive",
                "The exit appears in the farthest room from spawn"
            ]
        },

        // Active bonuses during shift
        bonuses: [
            {
                name: "Desperate Fortune",
                description: "Epic equipment drop chance doubled",
                icon: "💎",
                multiplier: 2.0,
                appliesTo: "epic_drops"
            }
        ],

        // Win condition
        winCondition: {
            title: "Escape",
            description: "Reach the exit portal before the lava consumes everything. The exit will appear when the shift begins.",
            icon: "🚪"
        },

        // Countdown time in seconds (10 minutes)
        countdownTime: 600,

        // Lava duration in seconds
        lavaDuration: 90,

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

            // Calculate step size to reach exit in exactly 90 seconds
            // With timer interval of 0.5s, we have 180 ticks in 90 seconds
            const totalTime = 90; // seconds
            const timerInterval = 0.5; // seconds per tick
            const totalTicks = totalTime / timerInterval; // 180 ticks
            const stepSize = startRadius / totalTicks;

            // Store exit position as lava center point
            game.shiftState = {
                timer: timerInterval,
                maxTimer: timerInterval,
                currentRadius: startRadius,
                stepSize: stepSize,
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
        // Countdown timer before shift triggers
        if (!game.shiftActive && game.shiftCountdown > 0) {
            game.shiftCountdown -= dt / 1000;

            // Trigger shift when countdown reaches 0
            if (game.shiftCountdown <= 0) {
                game.shiftCountdown = 0;
                triggerShift('magma_collapse');
            }
        }

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
        game.shiftCountdown = 600; // Reset to 10 minutes for next floor
    }
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('shift-system', ShiftSystemDef, 80);
} else {
    console.warn('⚠️ SystemManager not found - shift-system running standalone');
}

/**
 * Get current shift scenario info for UI display
 * @returns {object} Current shift scenario data or default magma_collapse
 */
function getCurrentShiftInfo() {
    // Return active shift if one is running
    if (game.activeShift) {
        return game.activeShift;
    }
    // Default to magma_collapse scenario info
    return shiftScenarios['magma_collapse'];
}

// Export for overlay use
window.getCurrentShiftInfo = getCurrentShiftInfo;
window.shiftScenarios = shiftScenarios;

console.log('✅ Shift system loaded');
