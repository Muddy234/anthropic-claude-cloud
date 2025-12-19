import gymnasium as gym
import numpy as np
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
import time

# ==========================================
# PART 1: THE "MIND READER" SCRIPT
# This is JavaScript wrapped in a Python string.
# Selenium will send this to Chrome to read your game variables.
# ==========================================
JS_OBSERVATION_SCRIPT = """
    // 1. Get Player Stats from your global game object
    const p = window.gameState.player;
    if (!p) return null; // Game not ready

    // 2. Define View Radius (5 tiles = 11x11 grid)
    const R = 5; 
    let grid = [];

    // 3. Build the Local Grid relative to player
    // 0=Floor, 1=Wall, 2=Enemy, 3=Loot, 9=Out of Bounds
    for (let y = p.y - R; y <= p.y + R; y++) {
        for (let x = p.x - R; x <= p.x + R; x++) {
            // Check bounds
            if (x < 0 || y < 0 || x >= window.gameState.map.width || y >= window.gameState.map.height) {
                grid.push(9); 
                continue;
            }

            let tileValue = 0; // Default floor

            // Check Walls (using your specific tileset logic)
            const tile = window.gameState.map.tiles[y][x];
            if (tile && tile.type === 'wall') {
                tileValue = 1;
            }

            // Check for Monsters at this specific coordinate
            const monster = window.gameState.monsters.find(m => m.x === x && m.y === y && !m.isDead());
            if (monster) {
                tileValue = 2;
            }
            
            // Check for Loot
            const item = window.gameState.items.find(i => i.x === x && i.y === y);
            if (item) {
                tileValue = 3;
            }

            grid.push(tileValue);
        }
    }

    // Return the data object to Python
    return {
        "grid": grid,
        "hp": p.hp,
        "max_hp": p.maxHp,
        "level": p.stats.level,
        "gold": p.stats.gold,
        "is_alive": !p.isDead()
    };
"""

# ==========================================
# PART 2: THE GYM ENVIRONMENT
# This connects the "Mind Reader" to the AI Brain
# ==========================================
class ShiftingChasmEnv(gym.Env):
    def __init__(self):
        super().__init__()
        
        # 1. Start the Browser
        # Make sure you have 'chromedriver' installed or use 'webdriver-manager'
        self.driver = webdriver.Chrome()
        
        # POINT THIS TO YOUR LOCAL SERVER URL
        self.driver.get("http://localhost:8000/index.html")
        time.sleep(2) # Wait for game load

        # 2. Define Actions
        # 0: Wait, 1: Up, 2: Down, 3: Left, 4: Right
        self.action_space = gym.spaces.Discrete(5)

        # 3. Define what the AI sees
        self.observation_space = gym.spaces.Dict({
            "grid": gym.spaces.Box(low=0, high=9, shape=(121,), dtype=np.int32),
            "stats": gym.spaces.Box(low=0, high=9999, shape=(4,), dtype=np.float32)
        })

    def step(self, action):
        # A. Send Action Keypress to Browser
        body = self.driver.find_element("tag name", "body")
        try:
            if action == 1: body.send_keys(Keys.ARROW_UP)
            elif action == 2: body.send_keys(Keys.ARROW_DOWN)
            elif action == 3: body.send_keys(Keys.ARROW_LEFT)
            elif action == 4: body.send_keys(Keys.ARROW_RIGHT)
            else: body.send_keys(Keys.SPACE) # Wait/Skip
        except:
            pass # Handle case where window isn't focused

        # B. Read the Result state using our JS Script
        data = self.driver.execute_script(JS_OBSERVATION_SCRIPT)
        
        if data is None:
            return self._get_empty_obs(), 0, True, False, {}

        # C. Process Observation for the AI
        obs = {
            "grid": np.array(data["grid"], dtype=np.int32),
            "stats": np.array([data["hp"], data["max_hp"], data["level"], data["gold"]], dtype=np.float32)
        }

        # D. Calculate Reward
        reward = 0.1 
        terminated = not data["is_alive"]
        
        if terminated:
            reward = -10.0
            
        return obs, reward, terminated, False, {}

    def reset(self, seed=None, options=None):
        self.driver.refresh()
        time.sleep(1) # Wait for reload
        return self.step(0)[0], {} # Return initial observation

    def _get_empty_obs(self):
        return {
            "grid": np.zeros(121, dtype=np.int32),
            "stats": np.zeros(4, dtype=np.float32)
        }

    def close(self):
        self.driver.quit()
