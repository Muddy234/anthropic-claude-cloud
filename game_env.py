import gymnasium as gym
import numpy as np
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
import time

# ==========================================
# PART 1: THE "MIND READER" SCRIPT
# ==========================================
JS_OBSERVATION_SCRIPT = """
    // 1. Safety Check: Is the game ready?
    if (typeof window.gameState === 'undefined' || !window.gameState.player) {
        return null; 
    }

    const p = window.gameState.player;
    
    // 2. Define View Radius (5 tiles = 11x11 grid)
    const R = 5; 
    let grid = [];

    // 3. Build the Local Grid
    if (window.gameState.map && window.gameState.map.tiles) {
        for (let y = p.y - R; y <= p.y + R; y++) {
            for (let x = p.x - R; x <= p.x + R; x++) {
                // Bounds check
                if (x < 0 || y < 0 || x >= window.gameState.map.width || y >= window.gameState.map.height) {
                    grid.push(9); 
                    continue;
                }

                let tileValue = 0; 
                const tile = window.gameState.map.tiles[y][x];
                if (tile && tile.type === 'wall') tileValue = 1;

                if (window.gameState.monsters) {
                    const monster = window.gameState.monsters.find(m => m.x === x && m.y === y && !m.isDead());
                    if (monster) tileValue = 2;
                }
                
                if (window.gameState.items) {
                    const item = window.gameState.items.find(i => i.x === x && i.y === y);
                    if (item) tileValue = 3;
                }
                grid.push(tileValue);
            }
        }
    } else {
        for(let i=0; i<121; i++) grid.push(0);
    }

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
        # options.add_argument("--headless") # Keep commented out to see what happens
        self.driver = webdriver.Chrome(options=options)
        
        print("Connecting to game...")
        self.driver.get("http://localhost:8000/index.html")
        
        # WAITING LOOP: Attempts to Start the Game
        self.wait_for_game_start()

        # 2. Define Actions and Observation
        self.action_space = gym.spaces.Discrete(5)
        self.observation_space = gym.spaces.Dict({
            "grid": gym.spaces.Box(low=0, high=9, shape=(121,), dtype=np.int32),
            "stats": gym.spaces.Box(low=0, high=9999, shape=(4,), dtype=np.float32)
        })

    def wait_for_game_start(self):
        """Presses Spacebar until gameState is found"""
        print("Attempting to start game...")
        
        for i in range(20): # Try for 20 seconds
            # A. Check if game is already running
            ready = self.driver.execute_script("return (typeof window.gameState !== 'undefined' && window.gameState.player) ? true : false;")
            if ready:
                print("Game successfully loaded and running!")
                return

            # B. If not, try to press SPACE to start
            try:
                body = self.driver.find_element(By.TAG_NAME, "body")
                body.click() # Focus window
                body.send_keys(Keys.SPACE) # Press Start
                print(f"Sent SPACE key... ({i+1}/20)")
            except:
                pass

            time.sleep(1)
            
        print("Warning: Game start timed out. Make sure the window is active.")

    def step(self, action):
        # A. Send Action
        try:
            body = self.driver.find_element(By.TAG_NAME, "body")
            if action == 1: body.send_keys(Keys.ARROW_UP)
            elif action == 2: body.send_keys(Keys.ARROW_DOWN)
            elif action == 3: body.send_keys(Keys.ARROW_LEFT)
            elif action == 4: body.send_keys(Keys.ARROW_RIGHT)
            else: body.send_keys(Keys.SPACE) # Wait/Skip
        except:
            pass 

        # B. Read the Result
        data = self.driver.execute_script(JS_OBSERVATION_SCRIPT)
        
        if data is None:
            # If data is missing mid-game, assume game over or restart needed
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
        # On reset, we might need to refresh or press space again if player died
        current_health = self.driver.execute_script("return window.gameState ? window.gameState.player.hp : 0;")
        
        if current_health <= 0:
            self.driver.refresh()
            self.wait_for_game_start()
        
        # Get initial state
        data = self.driver.execute_script(JS_OBSERVATION_SCRIPT)
        if data is None: return self._get_empty_obs(), {}

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