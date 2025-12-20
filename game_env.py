import gymnasium as gym
import numpy as np
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import time

# ==========================================
# PART 1: THE "MIND READER" SCRIPT
# ==========================================
# This JavaScript is injected into the browser to read game state
# Updated to match the actual game's data structures

JS_OBSERVATION_SCRIPT = """
    // 1. Safety Check: Is the game ready?
    if (typeof window.game === 'undefined' || !window.game.player) {
        return null;
    }

    const g = window.game;
    const p = g.player;

    // 2. Define View Radius (5 tiles = 11x11 grid)
    const R = 5;
    let grid = [];

    // Player position (use gridX/gridY for accurate grid position)
    const playerX = p.gridX ?? p.x;
    const playerY = p.gridY ?? p.y;

    // 3. Build the Local Grid
    // Map structure: game.map is a 2D array where game.map[y][x] = tile
    const mapHeight = g.map ? g.map.length : 0;
    const mapWidth = (g.map && g.map[0]) ? g.map[0].length : 0;

    for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
            const x = Math.floor(playerX) + dx;
            const y = Math.floor(playerY) + dy;

            // Bounds check
            if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight || !g.map[y]) {
                grid.push(9);  // Out of bounds
                continue;
            }

            let tileValue = 0;  // Default: floor
            const tile = g.map[y][x];

            // Check tile type
            if (!tile) {
                grid.push(9);  // No tile data
                continue;
            }

            if (tile.type === 'wall' || tile.type === 'void' || tile.type === 'interior_wall') {
                tileValue = 1;  // Wall
            }

            // Check for enemies at this position
            if (g.enemies && g.enemies.length > 0) {
                const enemy = g.enemies.find(e => {
                    const ex = Math.floor(e.gridX ?? e.x);
                    const ey = Math.floor(e.gridY ?? e.y);
                    return ex === x && ey === y && e.hp > 0;
                });
                if (enemy) tileValue = 2;  // Enemy
            }

            // Check for ground loot at this position
            if (g.groundLoot && g.groundLoot.length > 0) {
                const loot = g.groundLoot.find(i => {
                    const ix = Math.floor(i.x ?? i.gridX);
                    const iy = Math.floor(i.y ?? i.gridY);
                    return ix === x && iy === y;
                });
                if (loot) tileValue = 3;  // Loot
            }

            // Check for decorations (chests, shrines, etc.)
            if (g.decorations && g.decorations.length > 0) {
                const dec = g.decorations.find(d => d.x === x && d.y === y && d.interactable);
                if (dec) tileValue = 4;  // Interactable decoration
            }

            // Check for extraction points
            if (g.extractionPoints && g.extractionPoints.length > 0) {
                const ext = g.extractionPoints.find(e => e.x === x && e.y === y);
                if (ext) tileValue = 5;  // Extraction point
            }

            // Check for hazards
            if (tile.hazard) {
                tileValue = 6;  // Hazard (lava, spikes, etc.)
            }

            // Check for doorways
            if (g.doorways && g.doorways.length > 0) {
                const door = g.doorways.find(d => d.x === x && d.y === y);
                if (door) tileValue = 7;  // Doorway
            }

            grid.push(tileValue);
        }
    }

    // 4. Find nearest enemy for targeting info
    let nearestEnemyDist = 999;
    let nearestEnemyDir = [0, 0];  // [dx, dy] direction to nearest enemy
    if (g.enemies) {
        for (const e of g.enemies) {
            if (e.hp <= 0) continue;
            const ex = e.gridX ?? e.x;
            const ey = e.gridY ?? e.y;
            const dist = Math.abs(ex - playerX) + Math.abs(ey - playerY);
            if (dist < nearestEnemyDist) {
                nearestEnemyDist = dist;
                nearestEnemyDir = [Math.sign(ex - playerX), Math.sign(ey - playerY)];
            }
        }
    }

    // 5. Combat state
    const inCombat = p.combat ? p.combat.isInCombat : false;
    const hasTarget = p.combat && p.combat.currentTarget && p.combat.currentTarget.hp > 0;

    // 6. Return comprehensive observation
    return {
        "grid": grid,
        "hp": p.hp || 0,
        "max_hp": p.maxHp || 100,
        "floor": g.floor || 1,
        "gold": g.gold || 0,
        "is_alive": p.hp > 0,
        "in_combat": inCombat,
        "has_target": hasTarget,
        "player_x": playerX,
        "player_y": playerY,
        "enemy_count": g.enemies ? g.enemies.filter(e => e.hp > 0).length : 0,
        "nearest_enemy_dist": nearestEnemyDist,
        "nearest_enemy_dir": nearestEnemyDir,
        "shift_active": g.shiftActive || false,
        "game_state": g.state || "unknown"
    };
"""

# JavaScript to check if game is ready
JS_CHECK_READY = """
    return (typeof window.game !== 'undefined' &&
            window.game.player &&
            window.game.state === 'playing') ? true : false;
"""

# JavaScript to start the game
JS_START_GAME = """
    if (typeof window.startNewGameDungeon === 'function') {
        window.startNewGameDungeon();
        return true;
    }
    return false;
"""

# ==========================================
# PART 2: THE GYM ENVIRONMENT
# ==========================================
class ShiftingChasmEnv(gym.Env):
    """
    Gymnasium environment for The Shifting Chasm roguelike game.

    Observations:
        - grid: 11x11 (121 tiles) local view around player
          Encoding: 0=floor, 1=wall, 2=enemy, 3=loot, 4=interactable,
                    5=extraction, 6=hazard, 7=doorway, 9=out-of-bounds
        - stats: [hp, max_hp, floor, gold, enemy_count, nearest_enemy_dist, in_combat]

    Actions:
        0: Wait/Skip turn
        1: Move Up (Arrow Up)
        2: Move Down (Arrow Down)
        3: Move Left (Arrow Left)
        4: Move Right (Arrow Right)
        5: Attack/Interact (Space)

    Rewards:
        - +0.1 per step survived
        - +1.0 per enemy killed
        - +0.5 per loot picked up
        - +10.0 per floor cleared
        - -10.0 on death
    """

    metadata = {"render_modes": ["human"]}

    def __init__(self, headless=False, game_url="http://localhost:8000/index.html"):
        super().__init__()

        self.game_url = game_url
        self.headless = headless

        # Track state for reward calculation
        self.prev_hp = 100
        self.prev_gold = 0
        self.prev_floor = 1
        self.prev_enemy_count = 0
        self.steps_since_progress = 0
        self.total_steps = 0

        # 1. Start the Browser
        options = Options()
        if headless:
            options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1280,720")

        print("Launching Chrome browser...")
        self.driver = webdriver.Chrome(options=options)

        print(f"Connecting to game at {game_url}...")
        self.driver.get(game_url)

        # Wait for page load
        time.sleep(2)

        # Start the game
        self._start_game()

        # 2. Define Action and Observation Spaces
        self.action_space = gym.spaces.Discrete(6)

        self.observation_space = gym.spaces.Dict({
            "grid": gym.spaces.Box(low=0, high=9, shape=(121,), dtype=np.int32),
            "stats": gym.spaces.Box(low=-999, high=9999, shape=(7,), dtype=np.float32)
        })

    def _start_game(self):
        """Start a new game session"""
        print("Starting game...")

        # Try to start game via JavaScript function
        for attempt in range(10):
            try:
                # First check if already in game
                ready = self.driver.execute_script(JS_CHECK_READY)
                if ready:
                    print("Game already running!")
                    self._init_tracking()
                    return

                # Try to start via JS function
                started = self.driver.execute_script(JS_START_GAME)
                if started:
                    time.sleep(1)
                    ready = self.driver.execute_script(JS_CHECK_READY)
                    if ready:
                        print("Game started successfully!")
                        self._init_tracking()
                        return

                # Fallback: Try pressing Space key
                body = self.driver.find_element(By.TAG_NAME, "body")
                body.click()
                body.send_keys(Keys.SPACE)
                print(f"Sent SPACE key... (attempt {attempt + 1}/10)")

            except Exception as e:
                print(f"Start attempt {attempt + 1} failed: {e}")

            time.sleep(1)

        print("Warning: Game start may have timed out. Continuing anyway...")
        self._init_tracking()

    def _init_tracking(self):
        """Initialize tracking variables from current game state"""
        data = self.driver.execute_script(JS_OBSERVATION_SCRIPT)
        if data:
            self.prev_hp = data.get("hp", 100)
            self.prev_gold = data.get("gold", 0)
            self.prev_floor = data.get("floor", 1)
            self.prev_enemy_count = data.get("enemy_count", 0)
        self.steps_since_progress = 0
        self.total_steps = 0

    def step(self, action):
        """Execute one step in the environment"""
        self.total_steps += 1
        self.steps_since_progress += 1

        # A. Send Action
        try:
            body = self.driver.find_element(By.TAG_NAME, "body")

            if action == 0:
                pass  # Wait - do nothing
            elif action == 1:
                body.send_keys(Keys.ARROW_UP)
            elif action == 2:
                body.send_keys(Keys.ARROW_DOWN)
            elif action == 3:
                body.send_keys(Keys.ARROW_LEFT)
            elif action == 4:
                body.send_keys(Keys.ARROW_RIGHT)
            elif action == 5:
                body.send_keys(Keys.SPACE)  # Attack/Interact

        except Exception as e:
            print(f"Action failed: {e}")

        # Small delay for game to process
        time.sleep(0.05)

        # B. Read the Result
        data = self.driver.execute_script(JS_OBSERVATION_SCRIPT)

        if data is None:
            # Game not ready or error
            return self._get_empty_obs(), -10.0, True, False, {"error": "no_data"}

        # C. Process Observation
        obs = self._process_observation(data)

        # D. Calculate Reward
        reward, terminated = self._calculate_reward(data)

        # E. Update tracking
        self.prev_hp = data.get("hp", 0)
        self.prev_gold = data.get("gold", 0)
        self.prev_floor = data.get("floor", 1)
        self.prev_enemy_count = data.get("enemy_count", 0)

        # F. Build info dict
        info = {
            "floor": data.get("floor", 1),
            "hp": data.get("hp", 0),
            "gold": data.get("gold", 0),
            "enemies": data.get("enemy_count", 0),
            "total_steps": self.total_steps,
            "in_combat": data.get("in_combat", False)
        }

        return obs, reward, terminated, False, info

    def _process_observation(self, data):
        """Convert raw game data to observation format"""
        grid = np.array(data.get("grid", [0] * 121), dtype=np.int32)

        # Pad or truncate grid to exactly 121 elements
        if len(grid) < 121:
            grid = np.pad(grid, (0, 121 - len(grid)), constant_values=9)
        elif len(grid) > 121:
            grid = grid[:121]

        stats = np.array([
            data.get("hp", 0),
            data.get("max_hp", 100),
            data.get("floor", 1),
            data.get("gold", 0),
            data.get("enemy_count", 0),
            min(data.get("nearest_enemy_dist", 999), 20),  # Cap at 20
            1.0 if data.get("in_combat", False) else 0.0
        ], dtype=np.float32)

        return {"grid": grid, "stats": stats}

    def _calculate_reward(self, data):
        """Calculate reward based on game state changes"""
        reward = 0.0
        terminated = False

        hp = data.get("hp", 0)
        gold = data.get("gold", 0)
        floor = data.get("floor", 1)
        enemy_count = data.get("enemy_count", 0)
        is_alive = data.get("is_alive", True)

        # Death penalty
        if not is_alive or hp <= 0:
            reward = -10.0
            terminated = True
            return reward, terminated

        # Survival reward (small per step)
        reward += 0.01

        # Gold pickup reward
        gold_gained = gold - self.prev_gold
        if gold_gained > 0:
            reward += 0.5 * gold_gained / 10  # Scale reward
            self.steps_since_progress = 0

        # Enemy killed reward
        enemies_killed = self.prev_enemy_count - enemy_count
        if enemies_killed > 0 and enemy_count >= 0:
            reward += 1.0 * enemies_killed
            self.steps_since_progress = 0

        # Floor progression reward
        if floor > self.prev_floor:
            reward += 10.0
            self.steps_since_progress = 0

        # Damage taken penalty (encourage careful play)
        hp_lost = self.prev_hp - hp
        if hp_lost > 0:
            reward -= 0.1 * hp_lost / 10

        # Exploration encouragement
        # Penalize standing still too long
        if self.steps_since_progress > 100:
            reward -= 0.01

        return reward, terminated

    def reset(self, seed=None, options=None):
        """Reset the environment for a new episode"""
        super().reset(seed=seed)

        # Check current game state
        data = self.driver.execute_script(JS_OBSERVATION_SCRIPT)

        # If player is dead or game needs restart
        if data is None or not data.get("is_alive", False) or data.get("hp", 0) <= 0:
            print("Resetting game...")
            self.driver.refresh()
            time.sleep(2)
            self._start_game()

        # Get initial state
        data = self.driver.execute_script(JS_OBSERVATION_SCRIPT)
        if data is None:
            return self._get_empty_obs(), {}

        # Initialize tracking
        self._init_tracking()

        obs = self._process_observation(data)
        info = {
            "floor": data.get("floor", 1),
            "hp": data.get("hp", 100),
            "gold": data.get("gold", 0)
        }

        return obs, info

    def _get_empty_obs(self):
        """Return empty observation (for error cases)"""
        return {
            "grid": np.zeros(121, dtype=np.int32),
            "stats": np.zeros(7, dtype=np.float32)
        }

    def render(self):
        """Render is handled by the browser"""
        pass

    def close(self):
        """Clean up browser"""
        print("Closing browser...")
        try:
            self.driver.quit()
        except:
            pass


# ==========================================
# PART 3: UTILITY FUNCTIONS
# ==========================================

def test_environment():
    """Quick test to verify environment works"""
    print("=" * 50)
    print("Testing ShiftingChasmEnv")
    print("=" * 50)

    env = ShiftingChasmEnv(headless=False)

    try:
        obs, info = env.reset()
        print(f"Initial observation shape: grid={obs['grid'].shape}, stats={obs['stats'].shape}")
        print(f"Initial stats: HP={obs['stats'][0]}, Floor={obs['stats'][2]}")

        # Take a few random actions
        for i in range(20):
            action = env.action_space.sample()
            obs, reward, terminated, truncated, info = env.step(action)
            print(f"Step {i+1}: action={action}, reward={reward:.2f}, HP={obs['stats'][0]}")

            if terminated:
                print("Episode terminated!")
                break

            time.sleep(0.1)

        print("Test completed successfully!")

    finally:
        env.close()


if __name__ == "__main__":
    test_environment()
