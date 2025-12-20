import gymnasium as gym
import numpy as np
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
import time

# ==========================================
# PART 1: THE "MIND READER" SCRIPT
# Now with Nan-Protection!
# ==========================================
JS_OBSERVATION_SCRIPT = """
    // 1. Safety Check: Is the game ready?
    if (typeof window.gameState === 'undefined' || !window.gameState.player) {
        return null; 
    }

    const p = window.gameState.player;
    
    // Check HP directly (prevent crash if function missing)
    if (p.hp <= 0) return null; 

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

                if (window.gameState.enemies) { 
                    const enemy = window.gameState.enemies.find(m => m.x === x && m.y === y && m.hp > 0);
                    if (enemy) tileValue = 2;
                }
                
                if (window.gameState.groundLoot) { 
                    const item = window.gameState.groundLoot.find(i => i.x === x && i.y === y);
                    if (item) tileValue = 3;
                }
                grid.push(tileValue);
            }
        }
    } else {
        for(let i=0; i<121; i++) grid.push(0);
    }

    // 4. Safe Data Extraction
    // We look for gold in multiple likely places to avoid 'undefined'
    let currentGold = 0;
    if (p.stats && typeof p.stats.gold === 'number') currentGold = p.stats.gold;
    else if (p.gold && typeof p.gold === 'number') currentGold = p.gold;
    else if (window.sessionState && typeof window.sessionState.gold === 'number') currentGold = window.sessionState.gold;

    // Force everything to be a Number type
    return {
        "grid": grid,
        "hp": Number(p.hp) || 0,
        "max_hp": Number(p.maxHp) || 100,
        "level": (p.stats && p.stats.level) ? Number(p.stats.level) : 1,
        "gold": Number(currentGold) || 0,
        "is_alive": p.hp > 0
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
        # options.add_argument("--headless") 
        self.driver = webdriver.Chrome(options=options)
        
        print("Connecting to game...")
        self.driver.get("http://localhost:8000/index.html")
        
        # WAITING LOOP
        self.wait_for_game_start()

        # 2. Define Actions
        self.action_space = gym.spaces.Discrete(5)

        # 3. Define what the AI sees
        self.observation_space = gym.spaces.Dict({
            "grid": gym.spaces.Box(low=0, high=9, shape=(121,), dtype=np.int32),
            "stats": gym.spaces.Box(low=0, high=99999, shape=(4,), dtype=np.float32)
        })

    def wait_for_game_start(self):
        print("Attempting to start game...")
        for i in range(20): 
            ready = self.driver.execute_script("return (typeof window.gameState !== 'undefined' && window.gameState.player) ? true : false;")
            if ready:
                print("Game successfully loaded and running!")
                return

            try:
                body = self.driver.find_element(By.TAG_NAME, "body")
                body.click() 
                body.send_keys(Keys.SPACE)
                print(f"Sent SPACE key... ({i+1}/20)")
            except:
                pass
            time.sleep(1)
            
        print("Warning: Game start timed out.")

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
        
        if data is None:
            return self._get_empty_obs(), -10, True, False, {}

        # C. Process Observation (Double Safety Check)
        # We ensure np.nan never gets into the array
        stats_array = np.array([
            data.get("hp", 0), 
            data.get("max_hp", 100), 
            data.get("level", 1), 
            data.get("gold", 0)
        ], dtype=np.float32)

        # Final sanitization: Replace any lingering NaNs with 0
        stats_array = np.nan_to_num(stats_array)

        obs = {
            "grid": np.array(data["grid"], dtype=np.int32),
            "stats": stats_array
        }

        # D. Calculate Reward
        reward = 0.1 
        terminated = not data["is_alive"]
        if terminated: reward = -10.0
            
        return obs, reward, terminated, False, {}

    def reset(self, seed=None, options=None):
        current_health = self.driver.execute_script("return (window.gameState && window.gameState.player) ? window.gameState.player.hp : 0;")
        
        if current_health <= 0:
            self.driver.refresh()
            self.wait_for_game_start()
        
        data = self.driver.execute_script(JS_OBSERVATION_SCRIPT)
        if data is None: return self._get_empty_obs(), {}

        stats_array = np.array([
            data.get("hp", 100), 
            data.get("max_hp", 100), 
            data.get("level", 1), 
            data.get("gold", 0)
        ], dtype=np.float32)
        
        stats_array = np.nan_to_num(stats_array)

        obs = {
            "grid": np.array(data["grid"], dtype=np.int32),
            "stats": stats_array
        }
        return obs, {}

    def _get_empty_obs(self):
        return {
            "grid": np.zeros(121, dtype=np.int32),
            "stats": np.zeros(4, dtype=np.float32)
        }

    def close(self):
        self.driver.quit()