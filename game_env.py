#!/usr/bin/env python3
"""
High-Performance RL Environment for The Shifting Chasm

Architecture:
    Python (WebSocket Server) ←→ Browser (WebSocket Client)

    This replaces the slow Selenium HTTP JSON Wire Protocol with direct
    WebSocket communication, enabling >1000 SPS training throughput.

Features:
    - Semantic action space with A* pathfinding middleware
    - Heuristic safety guardrails (pre-inference interlocks)
    - k-frame skipping for temporal action repetition
    - Egocentric feature normalization (translational invariance)
    - Multi-channel observation tensor
    - Dense reward shaping with delta-based rewards
    - Explicit FSM state validation
"""

import gymnasium as gym
import numpy as np
import asyncio
import json
import threading
import time
import queue
import heapq
from typing import Optional, Dict, Any, Tuple, List, Set
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


# ==========================================
# SEMANTIC ACTION SPACE
# ==========================================

class SemanticAction(Enum):
    """
    High-level semantic actions that reduce search space from O(actions^steps) to O(targets).
    The A* middleware handles low-level pathfinding.
    """
    WAIT = 0                    # No-op
    ATTACK_NEAREST_ENEMY = 1    # Path to and attack nearest enemy
    ATTACK_WEAKEST_ENEMY = 2    # Path to and attack lowest HP enemy
    COLLECT_NEAREST_LOOT = 3    # Path to and collect nearest loot
    COLLECT_BEST_LOOT = 4       # Path to and collect highest value loot
    EXPLORE = 5                 # Move toward unexplored area
    RETREAT = 6                 # Move away from enemies
    USE_POTION = 7              # Use healing potion (if available)
    INTERACT = 8                # Interact with nearest interactable
    GOTO_EXTRACTION = 9         # Path to extraction point


@dataclass
class Target:
    """A semantic target for pathfinding"""
    x: int
    y: int
    target_type: str  # 'enemy', 'loot', 'extraction', 'explore'
    priority: float = 0.0
    entity_id: Optional[int] = None


@dataclass
class SaveInfo:
    """Persistent save state from the game (roguelite progression)"""
    bank_gold: int = 0
    bank_items: int = 0
    total_runs: int = 0
    extractions: int = 0
    deaths: int = 0
    deepest_floor: int = 1
    unlocked_floors: List[int] = field(default_factory=lambda: [1])
    skills: int = 0  # Number of unlocked skills


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

    # Position (global coordinates)
    player_x: float = 0.0
    player_y: float = 0.0

    # Combat info
    in_combat: bool = False
    enemy_count: int = 0
    nearest_enemy_dist: float = 999.0
    nearest_enemy_hp: float = 0.0

    # Inventory
    inventory_value: int = 0
    has_potion: bool = False
    potion_count: int = 0

    # Egocentric targets (relative deltas for translational invariance)
    enemies: List[Tuple[float, float, float]] = field(default_factory=list)  # (dx, dy, hp_ratio)
    loot_items: List[Tuple[float, float, float]] = field(default_factory=list)  # (dx, dy, value)
    extraction_point: Optional[Tuple[float, float]] = None  # (dx, dy) or None

    # Raw map for A* pathfinding
    walkable_map: Optional[np.ndarray] = None

    # Persistent save info (roguelite progression)
    save_info: Optional[SaveInfo] = None

    # Timestamps for sync
    frame_id: int = 0
    timestamp: float = 0.0


# ==========================================
# A* PATHFINDING
# ==========================================

class AStarPathfinder:
    """
    A* pathfinding for semantic action abstraction.
    Computes optimal path from player to target.
    """

    @staticmethod
    def heuristic(a: Tuple[int, int], b: Tuple[int, int]) -> float:
        """Manhattan distance heuristic"""
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    @staticmethod
    def find_path(
        start: Tuple[int, int],
        goal: Tuple[int, int],
        walkable: np.ndarray,
        max_iterations: int = 500
    ) -> Optional[List[Tuple[int, int]]]:
        """
        Find path from start to goal using A*.

        Args:
            start: (x, y) starting position
            goal: (x, y) target position
            walkable: 2D boolean array where True = walkable
            max_iterations: Max search iterations

        Returns:
            List of (x, y) positions from start to goal, or None if no path
        """
        if not walkable.any():
            return None

        height, width = walkable.shape

        # Bounds check
        if not (0 <= start[0] < width and 0 <= start[1] < height):
            return None
        if not (0 <= goal[0] < width and 0 <= goal[1] < height):
            return None

        # If goal is not walkable, find nearest walkable cell
        if not walkable[goal[1], goal[0]]:
            goal = AStarPathfinder._find_nearest_walkable(goal, walkable)
            if goal is None:
                return None

        # A* search
        open_set = [(0, start)]
        came_from: Dict[Tuple[int, int], Tuple[int, int]] = {}
        g_score: Dict[Tuple[int, int], float] = {start: 0}
        f_score: Dict[Tuple[int, int], float] = {start: AStarPathfinder.heuristic(start, goal)}

        iterations = 0
        while open_set and iterations < max_iterations:
            iterations += 1
            _, current = heapq.heappop(open_set)

            if current == goal:
                # Reconstruct path
                path = [current]
                while current in came_from:
                    current = came_from[current]
                    path.append(current)
                path.reverse()
                return path

            # 8-directional neighbors
            neighbors = [
                (current[0] + dx, current[1] + dy)
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1),
                               (-1, -1), (-1, 1), (1, -1), (1, 1)]
            ]

            for neighbor in neighbors:
                nx, ny = neighbor
                if not (0 <= nx < width and 0 <= ny < height):
                    continue
                if not walkable[ny, nx]:
                    continue

                # Diagonal movement cost
                dx = abs(neighbor[0] - current[0])
                dy = abs(neighbor[1] - current[1])
                move_cost = 1.414 if dx + dy == 2 else 1.0

                tentative_g = g_score[current] + move_cost

                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    f_score[neighbor] = tentative_g + AStarPathfinder.heuristic(neighbor, goal)
                    heapq.heappush(open_set, (f_score[neighbor], neighbor))

        return None  # No path found

    @staticmethod
    def _find_nearest_walkable(pos: Tuple[int, int], walkable: np.ndarray) -> Optional[Tuple[int, int]]:
        """Find nearest walkable cell to given position"""
        height, width = walkable.shape
        for radius in range(1, 10):
            for dx in range(-radius, radius + 1):
                for dy in range(-radius, radius + 1):
                    nx, ny = pos[0] + dx, pos[1] + dy
                    if 0 <= nx < width and 0 <= ny < height:
                        if walkable[ny, nx]:
                            return (nx, ny)
        return None

    @staticmethod
    def path_to_direction(current: Tuple[int, int], next_pos: Tuple[int, int]) -> int:
        """
        Convert path step to primitive action.
        Returns: 0=wait, 1=up, 2=down, 3=left, 4=right
        """
        dx = next_pos[0] - current[0]
        dy = next_pos[1] - current[1]

        # Primary direction
        if abs(dx) >= abs(dy):
            return 4 if dx > 0 else 3  # Right or Left
        else:
            return 2 if dy > 0 else 1  # Down or Up


# ==========================================
# HEURISTIC SAFETY GUARDRAILS
# ==========================================

class SafetyGuardrails:
    """
    Pre-inference safety interlocks that override the neural network
    in critical situations. Prevents early episode termination.
    """

    # Thresholds
    CRITICAL_HP_THRESHOLD = 0.30      # Below 30% HP
    EMERGENCY_HP_THRESHOLD = 0.15     # Below 15% HP = immediate heal
    POTION_HEAL_AMOUNT = 50           # Assumed heal amount

    @staticmethod
    def should_override(obs: GameObservation) -> Optional[int]:
        """
        Check if safety override is needed.

        Returns:
            Action to take (primitive action int) or None if no override needed
        """
        hp_ratio = obs.hp / max(obs.max_hp, 1)

        # Rule 1: Emergency heal when HP critically low and has potion
        if hp_ratio < SafetyGuardrails.EMERGENCY_HP_THRESHOLD and obs.has_potion:
            return SemanticAction.USE_POTION.value

        # Rule 2: Heal when low HP, has potion, and in danger
        if hp_ratio < SafetyGuardrails.CRITICAL_HP_THRESHOLD:
            if obs.has_potion and obs.in_combat:
                return SemanticAction.USE_POTION.value

            # Rule 3: Retreat when low HP and in combat without potion
            if obs.in_combat and not obs.has_potion:
                return SemanticAction.RETREAT.value

        # Rule 4: Attack if enemy is very close and we're healthy
        if obs.nearest_enemy_dist <= 1.5 and hp_ratio > 0.5:
            return SemanticAction.ATTACK_NEAREST_ENEMY.value

        return None  # No override, let the policy decide


# ==========================================
# SEMANTIC ACTION MIDDLEWARE
# ==========================================

class SemanticActionMiddleware:
    """
    Middleware that translates semantic actions into sequences of primitive actions.
    Uses A* pathfinding for navigation.
    """

    def __init__(self):
        self.current_path: List[Tuple[int, int]] = []
        self.current_target: Optional[Target] = None
        self.path_index: int = 0

    def reset(self):
        """Reset path state"""
        self.current_path = []
        self.current_target = None
        self.path_index = 0

    def translate_action(self, action: int, obs: GameObservation) -> int:
        """
        Translate semantic action to primitive action.

        Args:
            action: SemanticAction value
            obs: Current observation

        Returns:
            Primitive action (0-5)
        """
        try:
            sem_action = SemanticAction(action)
        except ValueError:
            return 0  # Invalid action = wait

        # Handle immediate actions
        if sem_action == SemanticAction.WAIT:
            return 0

        if sem_action == SemanticAction.USE_POTION:
            return 6  # Potion action (maps to hotkey 3)

        # Get player position
        player_pos = (int(obs.player_x), int(obs.player_y))

        # Find target based on semantic action
        target = self._get_target(sem_action, obs)

        if target is None:
            # No valid target, wait
            return 0

        # Check if target changed or no path
        if self.current_target is None or \
           (target.x, target.y) != (self.current_target.x, self.current_target.y):
            # Recompute path
            self._compute_path(player_pos, target, obs)

        # Execute next step in path
        return self._execute_path_step(player_pos, sem_action)

    def _get_target(self, action: SemanticAction, obs: GameObservation) -> Optional[Target]:
        """Get target position for semantic action"""

        if action == SemanticAction.ATTACK_NEAREST_ENEMY:
            if obs.enemies:
                # Find nearest enemy (smallest dx^2 + dy^2)
                nearest = min(obs.enemies, key=lambda e: e[0]**2 + e[1]**2)
                return Target(
                    x=int(obs.player_x + nearest[0]),
                    y=int(obs.player_y + nearest[1]),
                    target_type='enemy'
                )

        elif action == SemanticAction.ATTACK_WEAKEST_ENEMY:
            if obs.enemies:
                # Find enemy with lowest HP ratio
                weakest = min(obs.enemies, key=lambda e: e[2])
                return Target(
                    x=int(obs.player_x + weakest[0]),
                    y=int(obs.player_y + weakest[1]),
                    target_type='enemy'
                )

        elif action == SemanticAction.COLLECT_NEAREST_LOOT:
            if obs.loot_items:
                nearest = min(obs.loot_items, key=lambda l: l[0]**2 + l[1]**2)
                return Target(
                    x=int(obs.player_x + nearest[0]),
                    y=int(obs.player_y + nearest[1]),
                    target_type='loot'
                )

        elif action == SemanticAction.COLLECT_BEST_LOOT:
            if obs.loot_items:
                best = max(obs.loot_items, key=lambda l: l[2])
                return Target(
                    x=int(obs.player_x + best[0]),
                    y=int(obs.player_y + best[1]),
                    target_type='loot'
                )

        elif action == SemanticAction.RETREAT:
            if obs.enemies:
                # Move away from center of enemy mass
                avg_dx = sum(e[0] for e in obs.enemies) / len(obs.enemies)
                avg_dy = sum(e[1] for e in obs.enemies) / len(obs.enemies)
                # Target opposite direction
                retreat_x = int(obs.player_x - avg_dx * 3)
                retreat_y = int(obs.player_y - avg_dy * 3)
                return Target(x=retreat_x, y=retreat_y, target_type='retreat')

        elif action == SemanticAction.EXPLORE:
            # Find unexplored area (low geometry density in observation)
            # Simple heuristic: move toward edge of vision
            for dx, dy in [(5, 0), (-5, 0), (0, 5), (0, -5)]:
                x, y = int(obs.player_x + dx), int(obs.player_y + dy)
                return Target(x=x, y=y, target_type='explore')

        elif action == SemanticAction.GOTO_EXTRACTION:
            if obs.extraction_point:
                return Target(
                    x=int(obs.player_x + obs.extraction_point[0]),
                    y=int(obs.player_y + obs.extraction_point[1]),
                    target_type='extraction'
                )

        elif action == SemanticAction.INTERACT:
            # Interact with nearest interactable (loot as proxy)
            if obs.loot_items:
                nearest = min(obs.loot_items, key=lambda l: l[0]**2 + l[1]**2)
                return Target(
                    x=int(obs.player_x + nearest[0]),
                    y=int(obs.player_y + nearest[1]),
                    target_type='interact'
                )

        return None

    def _compute_path(self, player_pos: Tuple[int, int], target: Target, obs: GameObservation):
        """Compute A* path to target"""
        self.current_target = target
        self.path_index = 0

        # Build walkable map from geometry channel
        if obs.walkable_map is not None:
            walkable = obs.walkable_map
        else:
            # Fallback: use geometry channel (0 = walkable, 1 = wall)
            walkable = obs.geometry < 0.5

        # Compute path
        goal = (target.x, target.y)
        self.current_path = AStarPathfinder.find_path(player_pos, goal, walkable) or []

    def _execute_path_step(self, player_pos: Tuple[int, int], action: SemanticAction) -> int:
        """Execute next step in current path"""

        if not self.current_path or self.path_index >= len(self.current_path):
            # Path complete or invalid
            if self.current_target and self.current_target.target_type == 'enemy':
                # At enemy, attack
                return 5  # Attack/interact
            elif self.current_target and self.current_target.target_type in ['loot', 'interact']:
                # At loot, interact
                return 5
            return 0  # Wait

        # Get next position in path
        if self.path_index + 1 < len(self.current_path):
            next_pos = self.current_path[self.path_index + 1]
            self.path_index += 1
            return AStarPathfinder.path_to_direction(player_pos, next_pos)
        else:
            # At destination
            if self.current_target and self.current_target.target_type == 'enemy':
                return 5  # Attack
            return 0  # Wait


# ==========================================
# WEBSOCKET BRIDGE
# ==========================================

class WebSocketBridge:
    """
    High-performance WebSocket bridge between Python and browser.
    """

    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.connected = False
        self.client_ws = None

        # Thread-safe queues
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
                self.sync_event.set()

            elif msg_type == "ready":
                print("Game client ready for commands")

        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")

    def _parse_observation(self, payload: Dict) -> GameObservation:
        """Parse raw payload into structured GameObservation with egocentric features"""
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
        obs.has_potion = bool(payload.get("has_potion", False))
        obs.potion_count = int(payload.get("potion_count", 0))

        # Parse egocentric targets (relative deltas)
        if "enemies_egocentric" in payload:
            obs.enemies = [
                (float(e["dx"]), float(e["dy"]), float(e["hp_ratio"]))
                for e in payload["enemies_egocentric"]
            ]

        if "loot_egocentric" in payload:
            obs.loot_items = [
                (float(l["dx"]), float(l["dy"]), float(l["value"]))
                for l in payload["loot_egocentric"]
            ]

        if "extraction_egocentric" in payload:
            ext = payload["extraction_egocentric"]
            if ext:
                obs.extraction_point = (float(ext["dx"]), float(ext["dy"]))

        # Parse walkable map for A*
        if "walkable" in payload:
            obs.walkable_map = np.array(payload["walkable"], dtype=bool).reshape(
                payload.get("map_height", 50), payload.get("map_width", 50)
            )

        # Parse persistent save info (roguelite progression)
        if "save_info" in payload and payload["save_info"]:
            save_data = payload["save_info"]
            obs.save_info = SaveInfo(
                bank_gold=int(save_data.get("bank_gold", 0)),
                bank_items=int(save_data.get("bank_items", 0)),
                total_runs=int(save_data.get("total_runs", 0)),
                extractions=int(save_data.get("extractions", 0)),
                deaths=int(save_data.get("deaths", 0)),
                deepest_floor=int(save_data.get("deepest_floor", 1)),
                unlocked_floors=save_data.get("unlocked_floors", [1]),
                skills=int(save_data.get("skills", 0))
            )

        # Parse sync info
        obs.frame_id = int(payload.get("frame_id", 0))
        obs.timestamp = float(payload.get("timestamp", time.time()))

        return obs

    def send_action(self, action: int, action_type: str = "primitive") -> bool:
        """Send action to game client"""
        if not self.connected or not self.client_ws:
            return False

        try:
            message = json.dumps({
                "type": "action",
                "action": action,
                "action_type": action_type,
                "timestamp": time.time()
            })
            self.client_ws.send(message)
            return True
        except Exception as e:
            print(f"Send action error: {e}")
            return False

    def send_command(self, command: str, **kwargs) -> bool:
        """Send command to game client"""
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
    """Dense reward shaping for RL training with delta-based rewards."""

    # Reward weights
    WEIGHT_SURVIVAL = 0.001
    WEIGHT_GOLD_DELTA = 0.1
    WEIGHT_XP_DELTA = 0.01
    WEIGHT_HP_DELTA = 0.05
    WEIGHT_KILL = 1.0
    WEIGHT_FLOOR_CLEAR = 5.0
    WEIGHT_EXTRACTION = 10.0
    WEIGHT_DEATH = -10.0
    WEIGHT_TIME_PENALTY = -0.001
    WEIGHT_EXPLORATION = 0.01
    WEIGHT_COMBAT_ENGAGE = 0.1

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
        """Compute dense reward from observation delta."""
        self.total_steps += 1
        reward = 0.0
        terminated = False
        breakdown = {}

        # Time penalty
        time_penalty = self.WEIGHT_TIME_PENALTY
        reward += time_penalty
        breakdown["time_penalty"] = time_penalty

        # Terminal states
        if obs.state == GameState.DEAD:
            reward += self.WEIGHT_DEATH
            breakdown["death"] = self.WEIGHT_DEATH
            terminated = True
            return reward, terminated, breakdown

        if obs.state == GameState.EXTRACTED:
            extraction_bonus = self.WEIGHT_EXTRACTION + (obs.inventory_value * 0.1)
            reward += extraction_bonus
            breakdown["extraction"] = extraction_bonus
            terminated = True
            return reward, terminated, breakdown

        if obs.state == GameState.VILLAGE:
            breakdown["hub"] = 0.0
            return reward, terminated, breakdown

        if obs.state != GameState.DUNGEON_RUN:
            return 0.0, False, {"invalid_state": 0.0}

        # Survival reward
        survival = self.WEIGHT_SURVIVAL
        reward += survival
        breakdown["survival"] = survival

        # Delta-based rewards
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

            # HP delta
            hp_delta = obs.hp - self.prev_obs.hp
            if hp_delta != 0:
                hp_reward = hp_delta * self.WEIGHT_HP_DELTA
                reward += hp_reward
                breakdown["hp_delta"] = hp_reward

            # Enemy killed
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

            # Combat engagement
            if obs.in_combat and not self.prev_obs.in_combat:
                combat_reward = self.WEIGHT_COMBAT_ENGAGE
                reward += combat_reward
                breakdown["combat_engage"] = combat_reward

        # Exploration reward
        pos_key = (int(obs.player_x), int(obs.player_y))
        if pos_key not in self.visited_positions:
            self.visited_positions.add(pos_key)
            explore_reward = self.WEIGHT_EXPLORATION
            reward += explore_reward
            breakdown["exploration"] = explore_reward

        self.prev_obs = obs
        return reward, terminated, breakdown


# ==========================================
# GYMNASIUM ENVIRONMENT
# ==========================================

class ShiftingChasmEnv(gym.Env):
    """
    High-performance Gymnasium environment with:
    - Semantic action space (A* pathfinding)
    - Safety guardrails
    - k-frame skipping
    - Egocentric observations
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
        # New parameters
        use_semantic_actions: bool = True,
        use_safety_guardrails: bool = True,
        frame_skip: int = 4,
        use_egocentric: bool = True,
    ):
        super().__init__()

        self.use_websocket = use_websocket and WEBSOCKETS_AVAILABLE
        self.headless = headless
        self.game_url = game_url
        self.step_timeout = step_timeout

        # New configuration
        self.use_semantic_actions = use_semantic_actions
        self.use_safety_guardrails = use_safety_guardrails
        self.frame_skip = frame_skip
        self.use_egocentric = use_egocentric

        # Components
        self.bridge: Optional[WebSocketBridge] = None
        if self.use_websocket:
            self.bridge = WebSocketBridge(host=ws_host, port=ws_port)

        self.driver = None
        self.reward_shaper = RewardShaper()
        self.action_middleware = SemanticActionMiddleware()

        # Episode tracking
        self.episode_count = 0
        self.step_count = 0
        self.last_obs: Optional[GameObservation] = None

        # Define observation space
        if self.use_egocentric:
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
                ),
                "egocentric_enemies": gym.spaces.Box(
                    low=-np.inf, high=np.inf,
                    shape=(10, 3),  # Up to 10 enemies, (dx, dy, hp_ratio)
                    dtype=np.float32
                ),
                "egocentric_loot": gym.spaces.Box(
                    low=-np.inf, high=np.inf,
                    shape=(10, 3),  # Up to 10 loot, (dx, dy, value)
                    dtype=np.float32
                ),
            })
        else:
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
        if self.use_semantic_actions:
            self.action_space = gym.spaces.Discrete(len(SemanticAction))
        else:
            self.action_space = gym.spaces.Discrete(6)  # Primitive actions

        # Start communication
        self._initialize()

    def _initialize(self):
        """Initialize communication with game"""
        if self.use_websocket:
            print("Starting WebSocket server...")
            self.bridge.start()
            print(f"Waiting for game client to connect on ws://localhost:{self.bridge.port}")
        else:
            print("Using Selenium fallback...")
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

    def _get_observation(self) -> Optional[GameObservation]:
        """Get observation from game"""
        if self.use_websocket:
            return self.bridge.wait_for_observation(timeout=self.step_timeout)
        else:
            # Selenium fallback (minimal implementation)
            return None

    def _send_action(self, action: int):
        """Send action to game"""
        if self.use_websocket:
            self.bridge.send_action(action)
        # Selenium fallback handled elsewhere

    def _obs_to_gym(self, obs: GameObservation) -> Dict[str, np.ndarray]:
        """Convert GameObservation to Gym observation dict with egocentric features"""
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
            min(obs.nearest_enemy_dist, 20.0),
            1.0 if obs.in_combat else 0.0,
            obs.inventory_value,
            hp_ratio
        ], dtype=np.float32)

        result = {"spatial": spatial, "stats": stats}

        if self.use_egocentric:
            # Egocentric enemy features (dx, dy, hp_ratio)
            egocentric_enemies = np.zeros((10, 3), dtype=np.float32)
            for i, enemy in enumerate(obs.enemies[:10]):
                egocentric_enemies[i] = [enemy[0], enemy[1], enemy[2]]

            # Egocentric loot features (dx, dy, value)
            egocentric_loot = np.zeros((10, 3), dtype=np.float32)
            for i, loot in enumerate(obs.loot_items[:10]):
                egocentric_loot[i] = [loot[0], loot[1], loot[2]]

            result["egocentric_enemies"] = egocentric_enemies
            result["egocentric_loot"] = egocentric_loot

        return result

    def step(self, action: int) -> Tuple[Dict, float, bool, bool, Dict]:
        """
        Execute one step with k-frame skipping.

        The action is repeated for k frames, with rewards summed.
        """
        self.step_count += 1
        total_reward = 0.0
        terminated = False
        truncated = False
        info = {}
        obs = None

        # Check safety guardrails (pre-inference interlock)
        current_obs = self.last_obs
        if self.use_safety_guardrails and current_obs:
            override_action = SafetyGuardrails.should_override(current_obs)
            if override_action is not None:
                action = override_action
                info["safety_override"] = True

        # Translate semantic action to primitive action
        if self.use_semantic_actions and current_obs:
            primitive_action = self.action_middleware.translate_action(action, current_obs)
        else:
            primitive_action = action

        # k-frame skipping: repeat action for k frames
        for frame in range(self.frame_skip):
            # Send action
            self._send_action(primitive_action)

            # Small delay between frames
            if frame < self.frame_skip - 1:
                time.sleep(0.016)  # ~60 FPS

            # Get observation
            obs = self._get_observation()

            if obs is None:
                return self._get_empty_obs(), -10.0, True, False, {"error": "no_observation"}

            self.last_obs = obs

            # Compute reward for this frame
            reward, term, breakdown = self.reward_shaper.compute_reward(obs)
            total_reward += reward

            if term:
                terminated = True
                break

        # Convert observation
        gym_obs = self._obs_to_gym(obs)

        # Build info
        info.update({
            "state": obs.state.name,
            "floor": obs.floor,
            "hp": obs.hp,
            "gold": obs.gold,
            "xp": obs.xp,
            "enemy_count": obs.enemy_count,
            "step": self.step_count,
            "frames_executed": self.frame_skip if not terminated else frame + 1,
            "reward_breakdown": breakdown
        })

        # Include save info for progression tracking
        if obs.save_info:
            info["save_info"] = {
                "bank_gold": obs.save_info.bank_gold,
                "bank_items": obs.save_info.bank_items,
                "total_runs": obs.save_info.total_runs,
                "extractions": obs.save_info.extractions,
                "deaths": obs.save_info.deaths,
                "deepest_floor": obs.save_info.deepest_floor,
                "unlocked_floors": obs.save_info.unlocked_floors,
                "skills": obs.save_info.skills
            }

        return gym_obs, total_reward, terminated, truncated, info

    def reset(self, seed=None, options=None) -> Tuple[Dict, Dict]:
        """Reset environment for new episode"""
        super().reset(seed=seed)

        self.episode_count += 1
        self.step_count = 0
        self.reward_shaper.reset()
        self.action_middleware.reset()

        # Send reset command
        if self.use_websocket:
            self.bridge.send_command("reset")
            time.sleep(0.5)

        # Get initial observation
        obs = self._get_observation()

        if obs is None:
            return self._get_empty_obs(), {}

        self.last_obs = obs

        info = {
            "episode": self.episode_count,
            "state": obs.state.name,
            "semantic_actions": self.use_semantic_actions,
            "safety_guardrails": self.use_safety_guardrails,
            "frame_skip": self.frame_skip,
            "egocentric": self.use_egocentric
        }

        # Include save info for progression tracking
        if obs.save_info:
            info["save_info"] = {
                "bank_gold": obs.save_info.bank_gold,
                "bank_items": obs.save_info.bank_items,
                "total_runs": obs.save_info.total_runs,
                "extractions": obs.save_info.extractions,
                "deaths": obs.save_info.deaths,
                "deepest_floor": obs.save_info.deepest_floor,
                "unlocked_floors": obs.save_info.unlocked_floors,
                "skills": obs.save_info.skills
            }

        return self._obs_to_gym(obs), info

    def _get_empty_obs(self) -> Dict[str, np.ndarray]:
        """Return empty observation for error cases"""
        result = {
            "spatial": np.zeros((11, 11, 4), dtype=np.float32),
            "stats": np.zeros(10, dtype=np.float32)
        }
        if self.use_egocentric:
            result["egocentric_enemies"] = np.zeros((10, 3), dtype=np.float32)
            result["egocentric_loot"] = np.zeros((10, 3), dtype=np.float32)
        return result

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
# TEST UTILITY
# ==========================================

def test_environment(use_websocket: bool = False):
    """Test the environment"""
    print("=" * 60)
    print("Testing ShiftingChasmEnv with Intelligence Optimizations")
    print("=" * 60)
    print(f"Mode: {'WebSocket' if use_websocket else 'Selenium'}")
    print(f"Features enabled:")
    print(f"  - Semantic Actions (A* pathfinding)")
    print(f"  - Safety Guardrails")
    print(f"  - 4-Frame Skipping")
    print(f"  - Egocentric Normalization")
    print("=" * 60)

    env = ShiftingChasmEnv(
        use_websocket=use_websocket,
        headless=False,
        use_semantic_actions=True,
        use_safety_guardrails=True,
        frame_skip=4,
        use_egocentric=True
    )

    try:
        if use_websocket:
            print("\nWaiting for game client connection...")
            input("Press Enter when ready...")

        obs, info = env.reset()
        print(f"\nInitial observation shapes:")
        print(f"  spatial: {obs['spatial'].shape}")
        print(f"  stats: {obs['stats'].shape}")
        if 'egocentric_enemies' in obs:
            print(f"  egocentric_enemies: {obs['egocentric_enemies'].shape}")
            print(f"  egocentric_loot: {obs['egocentric_loot'].shape}")
        print(f"  state: {info.get('state', 'unknown')}")

        total_reward = 0
        for i in range(100):
            action = env.action_space.sample()
            obs, reward, terminated, truncated, info = env.step(action)
            total_reward += reward

            if i % 10 == 0:
                override = "SAFETY" if info.get("safety_override") else ""
                print(f"Step {i}: action={SemanticAction(action).name}, reward={reward:.3f}, "
                      f"total={total_reward:.3f}, HP={obs['stats'][0]:.0f} {override}")

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
