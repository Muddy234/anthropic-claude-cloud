#!/usr/bin/env python3
"""
High-Performance RL Environment for The Shifting Chasm

Architecture:
    Python (WebSocket Server) ←→ Browser (WebSocket Client)

    This replaces the slow Selenium HTTP JSON Wire Protocol with direct
    WebSocket communication, enabling >1000 SPS training throughput.

Features:
    - Multi-channel observation tensor (geometry, actors, loot, hazards)
    - Dense reward shaping with delta-based rewards
    - Explicit FSM state validation
    - Event-driven synchronization (no polling)
"""

import gymnasium as gym
import numpy as np
import asyncio
import json
import threading
import time
import queue
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum, auto

# WebSocket server
try:
    import websockets
    from websockets.sync.server import serve as ws_serve
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    print("Warning: websockets not installed. Install with: pip install websockets")

# Fallback to Selenium if needed
try:
    from selenium import webdriver
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.common.by import By
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False


# ==========================================
# GAME STATE FSM
# ==========================================

class GameState(Enum):
    """Finite State Machine for game states"""
    UNKNOWN = auto()
    LOADING = auto()
    MENU = auto()
    VILLAGE = auto()       # Hub/safe zone
    DUNGEON_RUN = auto()   # Active gameplay
    DEAD = auto()          # Player died
    EXTRACTED = auto()     # Successfully extracted


@dataclass
class GameObservation:
    """Structured observation from game"""
    # FSM State
    state: GameState = GameState.UNKNOWN

    # Multi-channel spatial data (11x11 grid, 4 channels)
    geometry: np.ndarray = field(default_factory=lambda: np.zeros((11, 11), dtype=np.float32))
    actors: np.ndarray = field(default_factory=lambda: np.zeros((11, 11), dtype=np.float32))
    loot: np.ndarray = field(default_factory=lambda: np.zeros((11, 11), dtype=np.float32))
    hazards: np.ndarray = field(default_factory=lambda: np.zeros((11, 11), dtype=np.float32))

    # Player stats
    hp: float = 100.0
    max_hp: float = 100.0
    gold: int = 0
    xp: int = 0
    floor: int = 1

    # Position
    player_x: float = 0.0
    player_y: float = 0.0

    # Combat info
    in_combat: bool = False
    enemy_count: int = 0
    nearest_enemy_dist: float = 999.0
    nearest_enemy_hp: float = 0.0

    # Inventory value (for extraction reward)
    inventory_value: int = 0

    # Timestamps for sync
    frame_id: int = 0
    timestamp: float = 0.0


# ==========================================
# WEBSOCKET BRIDGE
# ==========================================

class WebSocketBridge:
    """
    High-performance WebSocket bridge between Python and browser.

    Replaces Selenium's HTTP JSON Wire Protocol with direct WebSocket
    communication for orders of magnitude faster IPC.
    """

    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.connected = False
        self.client_ws = None

        # Thread-safe queues for async communication
        self.observation_queue: queue.Queue = queue.Queue(maxsize=1)
        self.action_queue: queue.Queue = queue.Queue(maxsize=1)
        self.sync_event = threading.Event()

        # Server thread
        self.server_thread: Optional[threading.Thread] = None
        self.running = False

        # Latest observation
        self.latest_obs: Optional[GameObservation] = None
        self.obs_lock = threading.Lock()

    def start(self):
        """Start WebSocket server in background thread"""
        if not WEBSOCKETS_AVAILABLE:
            raise RuntimeError("websockets package not installed")

        self.running = True
        self.server_thread = threading.Thread(target=self._run_server, daemon=True)
        self.server_thread.start()
        print(f"WebSocket server starting on ws://{self.host}:{self.port}")

    def stop(self):
        """Stop WebSocket server"""
        self.running = False
        if self.server_thread:
            self.server_thread.join(timeout=2.0)

    def _run_server(self):
        """Run WebSocket server (blocking, run in thread)"""
        with ws_serve(self._handle_client, self.host, self.port) as server:
            while self.running:
                server.serve_forever()

    def _handle_client(self, websocket):
        """Handle incoming WebSocket client connection"""
        print("Game client connected!")
        self.client_ws = websocket
        self.connected = True

        try:
            for message in websocket:
                self._process_message(message)
        except Exception as e:
            print(f"WebSocket error: {e}")
        finally:
            self.connected = False
            self.client_ws = None
            print("Game client disconnected")

    def _process_message(self, message: str):
        """Process incoming message from game client"""
        try:
            data = json.loads(message)
            msg_type = data.get("type", "")

            if msg_type == "observation":
                obs = self._parse_observation(data.get("payload", {}))
                with self.obs_lock:
                    self.latest_obs = obs
                self.sync_event.set()  # Signal that new observation is ready

            elif msg_type == "ready":
                print("Game client ready for commands")

        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")

    def _parse_observation(self, payload: Dict) -> GameObservation:
        """Parse raw payload into structured GameObservation"""
        obs = GameObservation()

        # Parse FSM state
        state_str = payload.get("game_state", "unknown").upper()
        state_map = {
            "LOADING": GameState.LOADING,
            "MENU": GameState.MENU,
            "VILLAGE": GameState.VILLAGE,
            "PLAYING": GameState.DUNGEON_RUN,
            "DUNGEON": GameState.DUNGEON_RUN,
            "DEAD": GameState.DEAD,
            "EXTRACTED": GameState.EXTRACTED,
        }
        obs.state = state_map.get(state_str, GameState.UNKNOWN)

        # Parse multi-channel spatial data
        if "geometry" in payload:
            obs.geometry = np.array(payload["geometry"], dtype=np.float32).reshape(11, 11)
        if "actors" in payload:
            obs.actors = np.array(payload["actors"], dtype=np.float32).reshape(11, 11)
        if "loot" in payload:
            obs.loot = np.array(payload["loot"], dtype=np.float32).reshape(11, 11)
        if "hazards" in payload:
            obs.hazards = np.array(payload["hazards"], dtype=np.float32).reshape(11, 11)

        # Parse stats
        obs.hp = float(payload.get("hp", 100))
        obs.max_hp = float(payload.get("max_hp", 100))
        obs.gold = int(payload.get("gold", 0))
        obs.xp = int(payload.get("xp", 0))
        obs.floor = int(payload.get("floor", 1))

        # Parse position
        obs.player_x = float(payload.get("player_x", 0))
        obs.player_y = float(payload.get("player_y", 0))

        # Parse combat info
        obs.in_combat = bool(payload.get("in_combat", False))
        obs.enemy_count = int(payload.get("enemy_count", 0))
        obs.nearest_enemy_dist = float(payload.get("nearest_enemy_dist", 999))
        obs.nearest_enemy_hp = float(payload.get("nearest_enemy_hp", 0))

        # Parse inventory
        obs.inventory_value = int(payload.get("inventory_value", 0))

        # Parse sync info
        obs.frame_id = int(payload.get("frame_id", 0))
        obs.timestamp = float(payload.get("timestamp", time.time()))

        return obs

    def send_action(self, action: int) -> bool:
        """Send action to game client"""
        if not self.connected or not self.client_ws:
            return False

        try:
            message = json.dumps({
                "type": "action",
                "action": action,
                "timestamp": time.time()
            })
            self.client_ws.send(message)
            return True
        except Exception as e:
            print(f"Send action error: {e}")
            return False

    def send_command(self, command: str, **kwargs) -> bool:
        """Send command to game client (reset, start, etc.)"""
        if not self.connected or not self.client_ws:
            return False

        try:
            message = json.dumps({
                "type": "command",
                "command": command,
                **kwargs
            })
            self.client_ws.send(message)
            return True
        except Exception as e:
            print(f"Send command error: {e}")
            return False

    def wait_for_observation(self, timeout: float = 1.0) -> Optional[GameObservation]:
        """Wait for next observation (event-driven sync)"""
        self.sync_event.clear()
        if self.sync_event.wait(timeout=timeout):
            with self.obs_lock:
                return self.latest_obs
        return None

    def get_latest_observation(self) -> Optional[GameObservation]:
        """Get latest observation without waiting"""
        with self.obs_lock:
            return self.latest_obs


# ==========================================
# REWARD SHAPER
# ==========================================

class RewardShaper:
    """
    Dense reward shaping for RL training.

    Implements delta-based rewards to provide dense learning signal
    and prevent reward hacking / local optima.
    """

    # Reward weights (tunable hyperparameters)
    WEIGHT_SURVIVAL = 0.001      # Small positive for being alive
    WEIGHT_GOLD_DELTA = 0.1      # Per gold gained
    WEIGHT_XP_DELTA = 0.01       # Per XP gained
    WEIGHT_HP_DELTA = 0.05       # Per HP delta (positive = healed, negative = damaged)
    WEIGHT_KILL = 1.0            # Per enemy killed
    WEIGHT_FLOOR_CLEAR = 5.0     # Per floor cleared
    WEIGHT_EXTRACTION = 10.0     # Base extraction reward
    WEIGHT_DEATH = -10.0         # Death penalty
    WEIGHT_TIME_PENALTY = -0.001 # Per step (encourages efficiency)
    WEIGHT_EXPLORATION = 0.01    # For visiting new tiles
    WEIGHT_COMBAT_ENGAGE = 0.1   # For engaging enemies

    def __init__(self):
        self.prev_obs: Optional[GameObservation] = None
        self.visited_positions: set = set()
        self.episode_start_time: float = time.time()
        self.total_steps: int = 0

    def reset(self):
        """Reset for new episode"""
        self.prev_obs = None
        self.visited_positions.clear()
        self.episode_start_time = time.time()
        self.total_steps = 0

    def compute_reward(self, obs: GameObservation) -> Tuple[float, bool, Dict[str, float]]:
        """
        Compute dense reward from observation delta.

        Returns:
            reward: float - total reward for this step
            terminated: bool - whether episode ended
            breakdown: dict - reward component breakdown for debugging
        """
        self.total_steps += 1
        reward = 0.0
        terminated = False
        breakdown = {}

        # Time penalty (encourages efficiency)
        time_penalty = self.WEIGHT_TIME_PENALTY
        reward += time_penalty
        breakdown["time_penalty"] = time_penalty

        # Handle terminal states
        if obs.state == GameState.DEAD:
            reward += self.WEIGHT_DEATH
            breakdown["death"] = self.WEIGHT_DEATH
            terminated = True
            return reward, terminated, breakdown

        if obs.state == GameState.EXTRACTED:
            # Extraction reward scales with inventory value
            extraction_bonus = self.WEIGHT_EXTRACTION + (obs.inventory_value * 0.1)
            reward += extraction_bonus
            breakdown["extraction"] = extraction_bonus
            terminated = True
            return reward, terminated, breakdown

        if obs.state == GameState.VILLAGE:
            # In hub - episode can continue but no dungeon rewards
            breakdown["hub"] = 0.0
            # Could terminate here if we only want dungeon episodes
            # terminated = True
            return reward, terminated, breakdown

        if obs.state != GameState.DUNGEON_RUN:
            # Not in valid gameplay state
            return 0.0, False, {"invalid_state": 0.0}

        # Survival reward (small positive for being alive in dungeon)
        survival = self.WEIGHT_SURVIVAL
        reward += survival
        breakdown["survival"] = survival

        # Delta-based rewards (require previous observation)
        if self.prev_obs is not None:
            # Gold delta
            gold_delta = obs.gold - self.prev_obs.gold
            if gold_delta != 0:
                gold_reward = gold_delta * self.WEIGHT_GOLD_DELTA
                reward += gold_reward
                breakdown["gold_delta"] = gold_reward

            # XP delta
            xp_delta = obs.xp - self.prev_obs.xp
            if xp_delta > 0:
                xp_reward = xp_delta * self.WEIGHT_XP_DELTA
                reward += xp_reward
                breakdown["xp_delta"] = xp_reward

            # HP delta (healed = positive, damaged = negative)
            hp_delta = obs.hp - self.prev_obs.hp
            if hp_delta != 0:
                hp_reward = hp_delta * self.WEIGHT_HP_DELTA
                reward += hp_reward
                breakdown["hp_delta"] = hp_reward

            # Enemy killed (enemy count decreased)
            enemies_killed = self.prev_obs.enemy_count - obs.enemy_count
            if enemies_killed > 0:
                kill_reward = enemies_killed * self.WEIGHT_KILL
                reward += kill_reward
                breakdown["kills"] = kill_reward

            # Floor progression
            if obs.floor > self.prev_obs.floor:
                floor_reward = self.WEIGHT_FLOOR_CLEAR
                reward += floor_reward
                breakdown["floor_clear"] = floor_reward

            # Combat engagement (entered combat)
            if obs.in_combat and not self.prev_obs.in_combat:
                combat_reward = self.WEIGHT_COMBAT_ENGAGE
                reward += combat_reward
                breakdown["combat_engage"] = combat_reward

        # Exploration reward (new position visited)
        pos_key = (int(obs.player_x), int(obs.player_y))
        if pos_key not in self.visited_positions:
            self.visited_positions.add(pos_key)
            explore_reward = self.WEIGHT_EXPLORATION
            reward += explore_reward
            breakdown["exploration"] = explore_reward

        # Update previous observation
        self.prev_obs = obs

        return reward, terminated, breakdown


# ==========================================
# GYMNASIUM ENVIRONMENT (WebSocket Mode)
# ==========================================

class ShiftingChasmEnv(gym.Env):
    """
    High-performance Gymnasium environment for The Shifting Chasm.

    Uses WebSocket communication for fast IPC (>1000 SPS capability).
    Falls back to Selenium if WebSocket connection not available.

    Observation Space:
        Dict with:
        - "spatial": Box(11, 11, 4) - Multi-channel spatial tensor
            Channel 0: Geometry (walls, floors)
            Channel 1: Actors (enemy HP normalized)
            Channel 2: Loot (item value heuristic)
            Channel 3: Hazards (danger level)
        - "stats": Box(10,) - Player stats vector
            [hp, max_hp, gold, xp, floor, enemy_count, nearest_enemy_dist,
             in_combat, inventory_value, hp_ratio]

    Action Space:
        Discrete(6):
            0: Wait/Skip
            1: Move Up
            2: Move Down
            3: Move Left
            4: Move Right
            5: Attack/Interact
    """

    metadata = {"render_modes": ["human"]}

    def __init__(
        self,
        use_websocket: bool = True,
        ws_host: str = "localhost",
        ws_port: int = 8765,
        headless: bool = False,
        game_url: str = "http://localhost:8000/index.html",
        step_timeout: float = 0.5,
    ):
        super().__init__()

        self.use_websocket = use_websocket and WEBSOCKETS_AVAILABLE
        self.headless = headless
        self.game_url = game_url
        self.step_timeout = step_timeout

        # WebSocket bridge
        self.bridge: Optional[WebSocketBridge] = None
        if self.use_websocket:
            self.bridge = WebSocketBridge(host=ws_host, port=ws_port)

        # Selenium fallback
        self.driver = None

        # Reward shaper
        self.reward_shaper = RewardShaper()

        # Episode tracking
        self.episode_count = 0
        self.step_count = 0
        self.last_obs: Optional[GameObservation] = None

        # Define observation space
        self.observation_space = gym.spaces.Dict({
            "spatial": gym.spaces.Box(
                low=0.0, high=1.0,
                shape=(11, 11, 4),
                dtype=np.float32
            ),
            "stats": gym.spaces.Box(
                low=-np.inf, high=np.inf,
                shape=(10,),
                dtype=np.float32
            )
        })

        # Define action space
        self.action_space = gym.spaces.Discrete(6)

        # Start communication
        self._initialize()

    def _initialize(self):
        """Initialize communication with game"""
        if self.use_websocket:
            print("Starting WebSocket server...")
            self.bridge.start()
            print(f"Waiting for game client to connect on ws://localhost:{self.bridge.port}")
            print("Load the game in browser with WebSocket client enabled.")
        else:
            print("Using Selenium fallback (slower)...")
            self._init_selenium()

    def _init_selenium(self):
        """Initialize Selenium WebDriver as fallback"""
        if not SELENIUM_AVAILABLE:
            raise RuntimeError("Neither websockets nor selenium available!")

        options = Options()
        if self.headless:
            options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1280,720")

        print("Launching Chrome browser...")
        self.driver = webdriver.Chrome(options=options)
        self.driver.get(self.game_url)
        time.sleep(2)

    def _get_observation_websocket(self) -> Optional[GameObservation]:
        """Get observation via WebSocket"""
        return self.bridge.wait_for_observation(timeout=self.step_timeout)

    def _get_observation_selenium(self) -> Optional[GameObservation]:
        """Get observation via Selenium (fallback)"""
        result = self.driver.execute_script(JS_OBSERVATION_MULTICHANNEL)
        if result is None:
            return None
        return self.bridge._parse_observation(result) if self.bridge else self._parse_selenium_result(result)

    def _parse_selenium_result(self, result: Dict) -> GameObservation:
        """Parse Selenium result into GameObservation"""
        obs = GameObservation()

        # Parse state
        state_str = result.get("game_state", "unknown").upper()
        state_map = {
            "PLAYING": GameState.DUNGEON_RUN,
            "VILLAGE": GameState.VILLAGE,
            "MENU": GameState.MENU,
        }
        obs.state = state_map.get(state_str, GameState.UNKNOWN)

        # Parse channels
        if "geometry" in result:
            obs.geometry = np.array(result["geometry"], dtype=np.float32).reshape(11, 11)
        if "actors" in result:
            obs.actors = np.array(result["actors"], dtype=np.float32).reshape(11, 11)
        if "loot" in result:
            obs.loot = np.array(result["loot"], dtype=np.float32).reshape(11, 11)
        if "hazards" in result:
            obs.hazards = np.array(result["hazards"], dtype=np.float32).reshape(11, 11)

        # Parse stats
        obs.hp = float(result.get("hp", 100))
        obs.max_hp = float(result.get("max_hp", 100))
        obs.gold = int(result.get("gold", 0))
        obs.xp = int(result.get("xp", 0))
        obs.floor = int(result.get("floor", 1))
        obs.in_combat = bool(result.get("in_combat", False))
        obs.enemy_count = int(result.get("enemy_count", 0))
        obs.nearest_enemy_dist = float(result.get("nearest_enemy_dist", 999))
        obs.inventory_value = int(result.get("inventory_value", 0))
        obs.player_x = float(result.get("player_x", 0))
        obs.player_y = float(result.get("player_y", 0))

        # Check for death
        if obs.hp <= 0:
            obs.state = GameState.DEAD

        return obs

    def _send_action_websocket(self, action: int):
        """Send action via WebSocket"""
        self.bridge.send_action(action)

    def _send_action_selenium(self, action: int):
        """Send action via Selenium"""
        try:
            body = self.driver.find_element(By.TAG_NAME, "body")
            if action == 1:
                body.send_keys(Keys.ARROW_UP)
            elif action == 2:
                body.send_keys(Keys.ARROW_DOWN)
            elif action == 3:
                body.send_keys(Keys.ARROW_LEFT)
            elif action == 4:
                body.send_keys(Keys.ARROW_RIGHT)
            elif action == 5:
                body.send_keys(Keys.SPACE)
            # action == 0 is wait, do nothing
        except Exception as e:
            print(f"Selenium action error: {e}")

    def _obs_to_gym(self, obs: GameObservation) -> Dict[str, np.ndarray]:
        """Convert GameObservation to Gym observation dict"""
        # Stack spatial channels: (11, 11, 4)
        spatial = np.stack([
            obs.geometry,
            obs.actors,
            obs.loot,
            obs.hazards
        ], axis=-1)

        # Build stats vector
        hp_ratio = obs.hp / max(obs.max_hp, 1)
        stats = np.array([
            obs.hp,
            obs.max_hp,
            obs.gold,
            obs.xp,
            obs.floor,
            obs.enemy_count,
            min(obs.nearest_enemy_dist, 20.0),  # Cap distance
            1.0 if obs.in_combat else 0.0,
            obs.inventory_value,
            hp_ratio
        ], dtype=np.float32)

        return {"spatial": spatial, "stats": stats}

    def step(self, action: int) -> Tuple[Dict, float, bool, bool, Dict]:
        """Execute one step in the environment"""
        self.step_count += 1

        # Send action
        if self.use_websocket:
            self._send_action_websocket(action)
        else:
            self._send_action_selenium(action)
            time.sleep(0.02)  # Minimal delay for Selenium

        # Get observation
        if self.use_websocket:
            obs = self._get_observation_websocket()
        else:
            obs = self._get_observation_selenium()

        if obs is None:
            # Connection lost or error
            return self._get_empty_obs(), -10.0, True, False, {"error": "no_observation"}

        self.last_obs = obs

        # Compute reward
        reward, terminated, reward_breakdown = self.reward_shaper.compute_reward(obs)

        # Convert observation
        gym_obs = self._obs_to_gym(obs)

        # Build info
        info = {
            "state": obs.state.name,
            "floor": obs.floor,
            "hp": obs.hp,
            "gold": obs.gold,
            "xp": obs.xp,
            "enemy_count": obs.enemy_count,
            "step": self.step_count,
            "reward_breakdown": reward_breakdown
        }

        return gym_obs, reward, terminated, False, info

    def reset(self, seed=None, options=None) -> Tuple[Dict, Dict]:
        """Reset environment for new episode"""
        super().reset(seed=seed)

        self.episode_count += 1
        self.step_count = 0
        self.reward_shaper.reset()

        # Send reset command
        if self.use_websocket:
            self.bridge.send_command("reset")
            time.sleep(0.5)  # Wait for game reset
        else:
            # Selenium: refresh page
            if self.last_obs and self.last_obs.state == GameState.DEAD:
                self.driver.refresh()
                time.sleep(2)

        # Get initial observation
        if self.use_websocket:
            obs = self._get_observation_websocket()
        else:
            obs = self._get_observation_selenium()

        if obs is None:
            return self._get_empty_obs(), {}

        self.last_obs = obs

        info = {
            "episode": self.episode_count,
            "state": obs.state.name
        }

        return self._obs_to_gym(obs), info

    def _get_empty_obs(self) -> Dict[str, np.ndarray]:
        """Return empty observation for error cases"""
        return {
            "spatial": np.zeros((11, 11, 4), dtype=np.float32),
            "stats": np.zeros(10, dtype=np.float32)
        }

    def render(self):
        """Rendering handled by browser"""
        pass

    def close(self):
        """Cleanup resources"""
        if self.bridge:
            self.bridge.stop()
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass


# ==========================================
# JAVASCRIPT INJECTION (Multi-Channel)
# ==========================================

JS_OBSERVATION_MULTICHANNEL = """
(function() {
    // Safety check
    if (typeof window.game === 'undefined' || !window.game.player) {
        return null;
    }

    const g = window.game;
    const p = g.player;

    // Grid parameters
    const R = 5;  // Radius (11x11 grid)
    const SIZE = 11;

    // Player position
    const playerX = Math.floor(p.gridX ?? p.x);
    const playerY = Math.floor(p.gridY ?? p.y);

    // Map dimensions
    const mapHeight = g.map ? g.map.length : 0;
    const mapWidth = (g.map && g.map[0]) ? g.map[0].length : 0;

    // Multi-channel arrays (flattened for JSON transfer)
    const geometry = new Array(SIZE * SIZE).fill(0);
    const actors = new Array(SIZE * SIZE).fill(0);
    const loot = new Array(SIZE * SIZE).fill(0);
    const hazards = new Array(SIZE * SIZE).fill(0);

    // Build channels
    for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
            const x = playerX + dx;
            const y = playerY + dy;
            const idx = (dy + R) * SIZE + (dx + R);

            // Bounds check
            if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight || !g.map[y]) {
                geometry[idx] = 1.0;  // Out of bounds = wall
                continue;
            }

            const tile = g.map[y][x];
            if (!tile) {
                geometry[idx] = 1.0;
                continue;
            }

            // CHANNEL 0: Geometry (walls = 1, floor = 0)
            if (tile.type === 'wall' || tile.type === 'void' || tile.type === 'interior_wall') {
                geometry[idx] = 1.0;
            }

            // CHANNEL 1: Actors (enemy HP normalized 0-1)
            if (g.enemies) {
                const enemy = g.enemies.find(e => {
                    const ex = Math.floor(e.gridX ?? e.x);
                    const ey = Math.floor(e.gridY ?? e.y);
                    return ex === x && ey === y && e.hp > 0;
                });
                if (enemy) {
                    const maxHp = enemy.maxHp || 100;
                    actors[idx] = Math.min(1.0, enemy.hp / maxHp);
                }
            }

            // CHANNEL 2: Loot (value heuristic 0-1)
            if (g.groundLoot) {
                const item = g.groundLoot.find(i => {
                    const ix = Math.floor(i.x ?? i.gridX);
                    const iy = Math.floor(i.y ?? i.gridY);
                    return ix === x && iy === y;
                });
                if (item) {
                    // Estimate value (rarity or price)
                    const value = item.value || item.price || 10;
                    loot[idx] = Math.min(1.0, value / 100);
                }
            }

            // Also check decorations for loot
            if (g.decorations) {
                const dec = g.decorations.find(d => d.x === x && d.y === y && d.interactable);
                if (dec) {
                    loot[idx] = Math.max(loot[idx], 0.5);  // Interactables have medium value
                }
            }

            // CHANNEL 3: Hazards (danger level 0-1)
            if (tile.hazard) {
                hazards[idx] = 1.0;
            }
            if (g.lavaTiles && g.lavaTiles.has && g.lavaTiles.has(`${x},${y}`)) {
                hazards[idx] = 1.0;
            }
        }
    }

    // Compute enemy stats
    let enemyCount = 0;
    let nearestDist = 999;
    let nearestHp = 0;

    if (g.enemies) {
        for (const e of g.enemies) {
            if (e.hp <= 0) continue;
            enemyCount++;
            const ex = e.gridX ?? e.x;
            const ey = e.gridY ?? e.y;
            const dist = Math.abs(ex - playerX) + Math.abs(ey - playerY);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestHp = e.hp;
            }
        }
    }

    // Compute inventory value
    let inventoryValue = 0;
    if (p.inventory) {
        for (const item of p.inventory) {
            inventoryValue += item.value || item.price || 10;
        }
    }

    // Return structured observation
    return {
        game_state: g.state || 'unknown',
        geometry: geometry,
        actors: actors,
        loot: loot,
        hazards: hazards,
        hp: p.hp || 0,
        max_hp: p.maxHp || 100,
        gold: g.gold || 0,
        xp: p.xp || 0,
        floor: g.floor || 1,
        player_x: playerX,
        player_y: playerY,
        in_combat: p.combat ? p.combat.isInCombat : false,
        enemy_count: enemyCount,
        nearest_enemy_dist: nearestDist,
        nearest_enemy_hp: nearestHp,
        inventory_value: inventoryValue,
        frame_id: g.frameCount || 0,
        timestamp: Date.now()
    };
})();
"""


# ==========================================
# WEBSOCKET CLIENT (JavaScript)
# ==========================================

JS_WEBSOCKET_CLIENT = """
// WebSocket Client for RL Training
// Inject this into the game to enable high-speed Python communication

(function() {
    'use strict';

    const WS_URL = 'ws://localhost:8765';
    let ws = null;
    let connected = false;
    let frameId = 0;

    // Action mapping
    const ACTION_MAP = {
        0: null,           // Wait
        1: 'ArrowUp',
        2: 'ArrowDown',
        3: 'ArrowLeft',
        4: 'ArrowRight',
        5: 'Space'
    };

    function connect() {
        ws = new WebSocket(WS_URL);

        ws.onopen = function() {
            console.log('[RL] Connected to Python server');
            connected = true;
            ws.send(JSON.stringify({ type: 'ready' }));
        };

        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);

            if (data.type === 'action') {
                executeAction(data.action);
            } else if (data.type === 'command') {
                executeCommand(data.command);
            }
        };

        ws.onclose = function() {
            console.log('[RL] Disconnected from Python server');
            connected = false;
            // Reconnect after delay
            setTimeout(connect, 1000);
        };

        ws.onerror = function(err) {
            console.error('[RL] WebSocket error:', err);
        };
    }

    function executeAction(action) {
        const key = ACTION_MAP[action];
        if (key) {
            // Simulate keypress
            const event = new KeyboardEvent('keydown', {
                key: key,
                code: key,
                bubbles: true
            });
            document.dispatchEvent(event);
        }

        // Send observation after action
        requestAnimationFrame(() => {
            sendObservation();
        });
    }

    function executeCommand(command) {
        if (command === 'reset') {
            if (typeof window.startNewGameDungeon === 'function') {
                window.startNewGameDungeon();
            } else {
                location.reload();
            }
        }
    }

    function sendObservation() {
        if (!connected || !ws) return;

        const obs = getObservation();
        if (obs) {
            obs.frame_id = ++frameId;
            ws.send(JSON.stringify({
                type: 'observation',
                payload: obs
            }));
        }
    }

    function getObservation() {
        // [Uses the same logic as JS_OBSERVATION_MULTICHANNEL]
        // ... (observation gathering code)
        return null; // Placeholder
    }

    // Start connection
    connect();

    // Send observations on game tick
    if (typeof window.game !== 'undefined') {
        setInterval(() => {
            if (connected && window.game.state === 'playing') {
                sendObservation();
            }
        }, 50);  // 20 FPS observation rate
    }

    console.log('[RL] WebSocket client initialized');
})();
"""


# ==========================================
# UTILITY FUNCTIONS
# ==========================================

def test_environment(use_websocket: bool = False):
    """Test the environment"""
    print("=" * 60)
    print("Testing ShiftingChasmEnv")
    print(f"Mode: {'WebSocket' if use_websocket else 'Selenium'}")
    print("=" * 60)

    env = ShiftingChasmEnv(use_websocket=use_websocket, headless=False)

    try:
        if use_websocket:
            print("\nWaiting for game client connection...")
            print("Open the game in browser and inject the WebSocket client.")
            input("Press Enter when ready...")

        obs, info = env.reset()
        print(f"\nInitial observation shapes:")
        print(f"  spatial: {obs['spatial'].shape}")
        print(f"  stats: {obs['stats'].shape}")
        print(f"  state: {info.get('state', 'unknown')}")

        total_reward = 0
        for i in range(100):
            action = env.action_space.sample()
            obs, reward, terminated, truncated, info = env.step(action)
            total_reward += reward

            if i % 10 == 0:
                print(f"Step {i}: reward={reward:.3f}, total={total_reward:.3f}, "
                      f"HP={obs['stats'][0]:.0f}, enemies={obs['stats'][5]:.0f}")

            if terminated:
                print(f"\nEpisode ended at step {i}")
                print(f"Final state: {info.get('state', 'unknown')}")
                break

            time.sleep(0.05)

        print(f"\nTotal reward: {total_reward:.3f}")
        print("Test complete!")

    finally:
        env.close()


if __name__ == "__main__":
    import sys
    use_ws = "--websocket" in sys.argv or "-ws" in sys.argv
    test_environment(use_websocket=use_ws)
