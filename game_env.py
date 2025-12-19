import gymnasium as gym
import numpy as np
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
import time

# ==========================================
# PART 1: THE "MIND READER" SCRIPT
# Updated to prevent crashing if game isn't ready
# ==========================================
JS_OBSERVATION_SCRIPT = """
    // 1. Safety Check: Is the game ready?
    if (typeof window.gameState === 'undefined' || !window.gameState.player) {
        return null; 
    }

    const p = window.gameState.player;
    if (p.isDead()) return null; // Treat death as end of episode

    // 2. Define View Radius (5 tiles = 11x11 grid)
    const R = 5; 
    let grid = [];

    // 3. Build the Local Grid relative to player
    // 0=Floor, 1=Wall, 2=Enemy, 3=Loot, 9=Out of Bounds
    if (window.gameState.map && window.gameState.map.tiles) {
        for (let y = p.y - R; y <= p.y + R; y++) {
            for (let x = p.x - R; x <= p.x + R; x++) {
                // Check bounds
                if (x < 0 || y < 0 || x >= window.gameState.map.width || y >= window.gameState.map.height) {
                    grid.push(9); 
                    continue;
                }

                let tileValue = 0; // Default floor

                // Check Walls
                const tile = window.gameState.map.tiles[y][x];
                if (tile && tile.type === 'wall') {
                    tileValue = 1;
                }

                // Check for Monsters
                if (window.gameState.monsters) {
                    const monster = window.gameState.monsters.find(m => m.x === x && m.y === y && !m.isDead());
                    if (monster) tileValue = 2;
                }
                
                // Check for Loot
                if (window.gameState.items) {
                    const item = window.gameState.items.find(i => i.x === x && i.y === y);
                    if (item) tileValue = 3;
                }

                grid.push(tileValue);
            }
        }
    } else {
        // Fallback if map isn't loaded yet
        for(let i=0; i<121; i++) grid.push(0);
    }

    // Return the data object to Python
    return {
        "grid": grid,
        "hp": p.hp,
        "max_hp": p.maxHp,
        "level": p.stats ? p.stats.level : 1,
        "gold": p.stats ? p.stats.gold : 0,
        "is_alive": !p.isDead()
    };
"""

# ==========================================
# PART 2: THE GYM ENVIRONMENT
# ==========================================
class ShiftingChasmEnv(gym.Env):
    def __init__(self):
        super().__init__()
        
        # 1. Start the Browser
        options = webdriver.ChromeOptions()
        # options.add_argument("--headless") # Uncomment this later to hide the window!
        self.driver = webdriver.Chrome(options=options)
        
        print("Connecting to game...")
        self.driver.get("http://localhost:8000/index.html")
        
        # WAITING LOOP: Wait until the game variable exists
        self.wait_for_game_load()

        # 2. Define Actions
        self.action_space = gym.spaces.Discrete(5)

        # 3. Define what the AI sees
        self.observation_space = gym.spaces.Dict({
            "grid": gym.spaces.Box(low=0, high=9, shape=(121,), dtype=np.int32),
            "stats": gym.spaces.Box(low=0, high=9999, shape=(4,), dtype=np.float32)
        })

    def wait_for_game_load(self):
        """Checks every second if window.gameState exists"""
        for i in range(10):
            try:
                # Try to interact with the game just in case it needs focus
                body = self.driver.find_element(By.TAG_NAME, "body")
                body.click()
                
                ready = self.driver.execute_script("return (window.gameState && window.gameState.player) ? true : false;")
                if ready:
                    print("Game successfully loaded!")
                    return
            except:
                pass
            print(f"Waiting for game load... {i+1}/10")
            time.sleep(1)
        print("Warning: Game might not be fully loaded, but proceeding...")

    def step(self, action):
        # A. Send Action
        try:
            body = self.driver.find_element(By.TAG_NAME, "body")
            if action == 1: body.send_keys(Keys.ARROW_UP)
            elif action == 2: body.send_keys(Keys.ARROW_DOWN)
            elif action == 3: body.send_keys(Keys.ARROW_LEFT)
            elif action == 4: body.send_keys(Keys.ARROW_RIGHT)
            else: body.send_keys(Keys.SPACE) 
        except:
            pass 

        # B. Read the Result
        data = self.driver.execute_script(JS_OBSERVATION_SCRIPT)
        
        # Handle cases where the game is resetting or player died
        if data is None:
            # Check if we should reset (player died)
            return self._get_empty_obs(), -10, True, False, {}

        # C. Process Observation
        obs = {
            "grid": np.array(data["grid"], dtype=np.int32),
            "stats": np.array([data["hp"], data["max_hp"], data["level"], data["gold"]], dtype=np.float32)
        }

        # D. Calculate Reward
        reward = 0.1 
        terminated = not data["is_alive"]
        if terminated: reward = -10.0
            
        return obs, reward, terminated, False, {}

    def reset(self, seed=None, options=None):
        self.driver.refresh()
        self.wait_for_game_load() # Wait again after refresh
        
        # Get initial state
        data = self.driver.execute_script(JS_OBSERVATION_SCRIPT)
        if data is None:
             return self._get_empty_obs(), {}

        obs = {
            "grid": np.array(data["grid"], dtype=np.int32),
            "stats": np.array([data["hp"], data["max_hp"], data["level"], data["gold"]], dtype=np.float32)
        }
        return obs, {}

    def _get_empty_obs(self):
        return {
            "grid": np.zeros(121, dtype=np.int32),
            "stats": np.zeros(4, dtype=np.float32)
        }

    def close(self):
        self.driver.quit()