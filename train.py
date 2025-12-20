#!/usr/bin/env python3
"""
High-Performance RL Training for The Shifting Chasm

Architecture:
    Python (WebSocket Server) ←→ Browser (WebSocket Client)

Features:
    - WebSocket transport for >1000 SPS (vs ~10-20 with Selenium)
    - Multi-channel CNN observation space
    - Dense reward shaping
    - FSM state validation
    - Tensorboard logging
    - Model checkpointing with progress tracking
    - Spectate mode to watch trained AI

Usage:
    # WebSocket mode (high performance, requires rl-bridge.js in game)
    python train.py --websocket --timesteps 100000

    # Selenium mode (fallback, slower but no game modification needed)
    python train.py --timesteps 10000

    # Continue training from checkpoint
    python train.py --continue --timesteps 50000

    # Test a trained model
    python train.py --test

    # Spectate the AI (watch it play with detailed HUD)
    python train.py --spectate

    # Show training progress/stats
    python train.py --stats

    # Headless training (Selenium mode only)
    python train.py --headless --timesteps 10000
"""

import argparse
import os
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

import numpy as np

# Check for required packages
try:
    from stable_baselines3 import PPO
    from stable_baselines3.common.callbacks import (
        CheckpointCallback,
        EvalCallback,
        BaseCallback
    )
    from stable_baselines3.common.monitor import Monitor
    from stable_baselines3.common.vec_env import DummyVecEnv, SubprocVecEnv
    from stable_baselines3.common.torch_layers import BaseFeaturesExtractor
    SB3_AVAILABLE = True
except ImportError:
    SB3_AVAILABLE = False
    print("Error: stable-baselines3 not installed.")
    print("Install with: pip install 'stable-baselines3[extra]'")

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

from game_env import ShiftingChasmEnv, GameState, SemanticAction


# ==========================================
# PROGRESS TRACKER - PERSISTENT STATE
# ==========================================

class ProgressTracker:
    """
    Persistent progress tracker that saves training history and stats.
    This allows you to "log in" and see what the AI has learned.
    """

    def __init__(self, save_path: str = "ai_progress"):
        self.save_path = Path(save_path)
        self.save_path.mkdir(exist_ok=True)

        self.progress_file = self.save_path / "progress.json"
        self.history_file = self.save_path / "training_history.json"

        # Load existing progress
        self.progress = self._load_progress()
        self.history = self._load_history()

    def _load_progress(self) -> Dict:
        """Load progress from file or create new."""
        if self.progress_file.exists():
            with open(self.progress_file, 'r') as f:
                return json.load(f)
        return {
            "total_timesteps": 0,
            "total_episodes": 0,
            "total_training_time_minutes": 0,
            "best_episode_reward": float('-inf'),
            "best_floor_reached": 1,
            "total_kills": 0,
            "total_deaths": 0,
            "total_extractions": 0,
            "training_sessions": 0,
            "created_at": datetime.now().isoformat(),
            "last_trained": None,
            "model_version": 1,
            # In-game save progression (roguelite)
            "game_save": {
                "bank_gold": 0,
                "bank_items": 0,
                "total_runs": 0,
                "extractions": 0,
                "deaths": 0,
                "deepest_floor": 1,
                "unlocked_floors": [1],
                "skills": 0
            }
        }

    def _load_history(self) -> List[Dict]:
        """Load training history."""
        if self.history_file.exists():
            with open(self.history_file, 'r') as f:
                return json.load(f)
        return []

    def save(self):
        """Save progress to disk."""
        self.progress["last_trained"] = datetime.now().isoformat()
        with open(self.progress_file, 'w') as f:
            json.dump(self.progress, f, indent=2)
        with open(self.history_file, 'w') as f:
            json.dump(self.history[-1000:], f, indent=2)  # Keep last 1000 episodes

    def record_episode(self, reward: float, length: int, floor: int, state: str,
                       actions: Dict[str, int] = None, save_info: Dict = None):
        """Record an episode result."""
        self.progress["total_episodes"] += 1

        if reward > self.progress["best_episode_reward"]:
            self.progress["best_episode_reward"] = reward

        if floor > self.progress["best_floor_reached"]:
            self.progress["best_floor_reached"] = floor

        if state == "DEAD":
            self.progress["total_deaths"] += 1
        elif state == "EXTRACTED":
            self.progress["total_extractions"] += 1

        # Update game save progression if provided
        if save_info:
            self.update_game_save(save_info)

        # Add to history
        episode_data = {
            "episode": self.progress["total_episodes"],
            "timestep": self.progress["total_timesteps"],
            "reward": reward,
            "length": length,
            "floor": floor,
            "state": state,
            "timestamp": datetime.now().isoformat()
        }
        if actions:
            episode_data["actions"] = actions
        if save_info:
            episode_data["save_info"] = save_info
        self.history.append(episode_data)

    def update_game_save(self, save_info: Dict):
        """Update in-game save progression tracking."""
        if "game_save" not in self.progress:
            self.progress["game_save"] = {}

        gs = self.progress["game_save"]

        # Update with latest values from game
        gs["bank_gold"] = max(gs.get("bank_gold", 0), save_info.get("bank_gold", 0))
        gs["bank_items"] = max(gs.get("bank_items", 0), save_info.get("bank_items", 0))
        gs["total_runs"] = save_info.get("total_runs", gs.get("total_runs", 0))
        gs["extractions"] = save_info.get("extractions", gs.get("extractions", 0))
        gs["deaths"] = save_info.get("deaths", gs.get("deaths", 0))
        gs["deepest_floor"] = max(gs.get("deepest_floor", 1), save_info.get("deepest_floor", 1))
        gs["skills"] = max(gs.get("skills", 0), save_info.get("skills", 0))

        # Merge unlocked floors
        existing_floors = set(gs.get("unlocked_floors", [1]))
        new_floors = set(save_info.get("unlocked_floors", [1]))
        gs["unlocked_floors"] = sorted(existing_floors | new_floors)

    def record_timesteps(self, n: int):
        """Record timesteps."""
        self.progress["total_timesteps"] += n

    def record_training_time(self, minutes: float):
        """Record training time."""
        self.progress["total_training_time_minutes"] += minutes

    def start_session(self):
        """Mark start of training session."""
        self.progress["training_sessions"] += 1

    def get_summary(self) -> str:
        """Get a summary of AI progress."""
        p = self.progress

        # Calculate rates
        survival_rate = 0
        if p["total_deaths"] + p["total_extractions"] > 0:
            survival_rate = p["total_extractions"] / (p["total_deaths"] + p["total_extractions"]) * 100

        # Get recent performance
        recent_rewards = [ep["reward"] for ep in self.history[-100:]] if self.history else [0]
        recent_avg = np.mean(recent_rewards) if recent_rewards else 0

        # Get improvement trend
        if len(self.history) >= 200:
            old_avg = np.mean([ep["reward"] for ep in self.history[-200:-100]])
            new_avg = np.mean([ep["reward"] for ep in self.history[-100:]])
            trend = new_avg - old_avg
            trend_str = f"+{trend:.2f}" if trend > 0 else f"{trend:.2f}"
        else:
            trend_str = "N/A (need more data)"

        # Get game save info
        gs = p.get("game_save", {})
        unlocked_floors = gs.get("unlocked_floors", [1])
        unlocked_str = ", ".join(str(f) for f in unlocked_floors[:5])
        if len(unlocked_floors) > 5:
            unlocked_str += f"... ({len(unlocked_floors)} total)"

        summary = f"""
╔══════════════════════════════════════════════════════════════════════╗
║                    🤖 AI AGENT PROGRESS REPORT                       ║
╠══════════════════════════════════════════════════════════════════════╣
║  Created:           {p['created_at'][:19]}
║  Last Trained:      {p['last_trained'][:19] if p['last_trained'] else 'Never'}
║  Model Version:     v{p['model_version']}
╠══════════════════════════════════════════════════════════════════════╣
║  📊 TRAINING STATS
║  ─────────────────────────────────────────────────────────────────────
║  Total Timesteps:   {p['total_timesteps']:,}
║  Total Episodes:    {p['total_episodes']:,}
║  Training Time:     {p['total_training_time_minutes']:.1f} minutes
║  Training Sessions: {p['training_sessions']}
╠══════════════════════════════════════════════════════════════════════╣
║  🏆 ACHIEVEMENTS
║  ─────────────────────────────────────────────────────────────────────
║  Best Reward:       {p['best_episode_reward']:.2f}
║  Best Floor:        {p['best_floor_reached']}
║  Extractions:       {p['total_extractions']}
║  Deaths:            {p['total_deaths']}
║  Survival Rate:     {survival_rate:.1f}%
╠══════════════════════════════════════════════════════════════════════╣
║  💾 IN-GAME SAVE (Roguelite Progression)
║  ─────────────────────────────────────────────────────────────────────
║  Bank Gold:         {gs.get('bank_gold', 0):,}
║  Bank Items:        {gs.get('bank_items', 0)}
║  Skills Unlocked:   {gs.get('skills', 0)}
║  Deepest Floor:     {gs.get('deepest_floor', 1)}
║  Unlocked Floors:   {unlocked_str}
║  Game Runs:         {gs.get('total_runs', 0)} ({gs.get('extractions', 0)} extractions, {gs.get('deaths', 0)} deaths)
╠══════════════════════════════════════════════════════════════════════╣
║  📈 PERFORMANCE (Last 100 Episodes)
║  ─────────────────────────────────────────────────────────────────────
║  Avg Reward:        {recent_avg:.2f}
║  Trend:             {trend_str}
╚══════════════════════════════════════════════════════════════════════╝
"""
        return summary

    def get_recent_episodes(self, n: int = 20) -> str:
        """Get recent episode details."""
        if not self.history:
            return "No episodes recorded yet."

        lines = ["Recent Episodes:"]
        lines.append("-" * 70)
        lines.append(f"{'#':>5} {'Reward':>10} {'Length':>8} {'Floor':>6} {'State':>12}")
        lines.append("-" * 70)

        for ep in self.history[-n:]:
            lines.append(f"{ep['episode']:>5} {ep['reward']:>10.2f} {ep['length']:>8} "
                        f"{ep['floor']:>6} {ep['state']:>12}")

        return "\n".join(lines)


# ==========================================
# CUSTOM CNN FEATURE EXTRACTOR
# ==========================================

if SB3_AVAILABLE and TORCH_AVAILABLE:

    class ShiftingChasmCNN(BaseFeaturesExtractor):
        """
        Custom CNN feature extractor for multi-channel spatial observations.

        Processes the (11, 11, 4) spatial tensor through convolutions while
        also incorporating the stats vector and egocentric features.
        """

        def __init__(self, observation_space, features_dim: int = 256):
            super().__init__(observation_space, features_dim)

            # Spatial pathway (for 11x11x4 tensor)
            self.spatial_net = nn.Sequential(
                nn.Conv2d(4, 32, kernel_size=3, stride=1, padding=1),
                nn.ReLU(),
                nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1),
                nn.ReLU(),
                nn.Conv2d(64, 64, kernel_size=3, stride=2, padding=1),
                nn.ReLU(),
                nn.Flatten()
            )

            spatial_output_size = 64 * 6 * 6  # 2304

            # Stats pathway
            stats_dim = observation_space['stats'].shape[0]
            self.stats_net = nn.Sequential(
                nn.Linear(stats_dim, 64),
                nn.ReLU(),
                nn.Linear(64, 64),
                nn.ReLU()
            )

            # Egocentric pathway (if available)
            self.has_egocentric = 'egocentric_enemies' in observation_space.spaces
            ego_output_size = 0

            if self.has_egocentric:
                # Process egocentric enemies (10, 3) and loot (10, 3)
                self.ego_enemy_net = nn.Sequential(
                    nn.Flatten(),
                    nn.Linear(30, 32),
                    nn.ReLU()
                )
                self.ego_loot_net = nn.Sequential(
                    nn.Flatten(),
                    nn.Linear(30, 32),
                    nn.ReLU()
                )
                ego_output_size = 64

            # Combined pathway
            combined_input_size = spatial_output_size + 64 + ego_output_size
            self.combined_net = nn.Sequential(
                nn.Linear(combined_input_size, 256),
                nn.ReLU(),
                nn.Linear(256, features_dim),
                nn.ReLU()
            )

        def forward(self, observations: Dict[str, torch.Tensor]) -> torch.Tensor:
            spatial = observations['spatial']
            stats = observations['stats']

            # Permute spatial: (batch, H, W, C) → (batch, C, H, W)
            spatial = spatial.permute(0, 3, 1, 2)

            # Process pathways
            spatial_features = self.spatial_net(spatial)
            stats_features = self.stats_net(stats)

            # Process egocentric if available
            if self.has_egocentric and 'egocentric_enemies' in observations:
                ego_enemies = self.ego_enemy_net(observations['egocentric_enemies'])
                ego_loot = self.ego_loot_net(observations['egocentric_loot'])
                combined = torch.cat([spatial_features, stats_features, ego_enemies, ego_loot], dim=1)
            else:
                combined = torch.cat([spatial_features, stats_features], dim=1)

            return self.combined_net(combined)


# ==========================================
# CUSTOM CALLBACKS
# ==========================================

class ProgressTrackingCallback(BaseCallback):
    """Callback that integrates with ProgressTracker for persistent stats."""

    def __init__(self, tracker: ProgressTracker, verbose: int = 0):
        super().__init__(verbose)
        self.tracker = tracker
        self.episode_action_counts = {}
        self.latest_save_info = None

    def _on_step(self) -> bool:
        # Track actions
        if 'actions' in self.locals:
            action = self.locals['actions'][0]
            action_name = SemanticAction(action).name if action < len(SemanticAction) else str(action)
            self.episode_action_counts[action_name] = self.episode_action_counts.get(action_name, 0) + 1

        # Track latest save info from infos
        infos = self.locals.get('infos', [{}])
        if infos and 'save_info' in infos[0]:
            self.latest_save_info = infos[0]['save_info']

        # Check for episode end
        for idx, done in enumerate(self.locals.get('dones', [])):
            if done:
                info = self.locals.get('infos', [{}])[idx]
                if 'episode' in info:
                    self.tracker.record_episode(
                        reward=info['episode']['r'],
                        length=info['episode']['l'],
                        floor=info.get('floor', 1),
                        state=info.get('state', 'unknown'),
                        actions=self.episode_action_counts.copy(),
                        save_info=self.latest_save_info
                    )
                    self.episode_action_counts = {}

        return True

    def _on_rollout_end(self) -> None:
        # Record timesteps from this rollout
        self.tracker.record_timesteps(self.model.n_steps)


class ProgressCallback(BaseCallback):
    """Callback for printing training progress."""

    def __init__(self, check_freq: int = 1000, verbose: int = 1):
        super().__init__(verbose)
        self.check_freq = check_freq
        self.start_time = None

    def _on_training_start(self) -> None:
        self.start_time = time.time()

    def _on_step(self) -> bool:
        if self.n_calls % self.check_freq == 0:
            elapsed = time.time() - self.start_time
            sps = self.n_calls / elapsed if elapsed > 0 else 0

            ep_info_buffer = self.model.ep_info_buffer
            if len(ep_info_buffer) > 0:
                mean_reward = np.mean([ep['r'] for ep in ep_info_buffer])
                mean_length = np.mean([ep['l'] for ep in ep_info_buffer])
            else:
                mean_reward = 0
                mean_length = 0

            print(f"Step {self.n_calls:,} | "
                  f"SPS: {sps:.1f} | "
                  f"Reward: {mean_reward:.2f} | "
                  f"Ep Len: {mean_length:.0f} | "
                  f"Time: {elapsed/60:.1f}m")

        return True


# ==========================================
# ENVIRONMENT CREATION
# ==========================================

def make_env(
    use_websocket: bool = True,
    headless: bool = False,
    game_url: str = "http://localhost:8000/index.html",
    use_semantic_actions: bool = True,
    use_safety_guardrails: bool = True,
    frame_skip: int = 4
):
    """Create and wrap the game environment."""
    def _init():
        env = ShiftingChasmEnv(
            use_websocket=use_websocket,
            headless=headless,
            game_url=game_url,
            use_semantic_actions=use_semantic_actions,
            use_safety_guardrails=use_safety_guardrails,
            frame_skip=frame_skip
        )
        env = Monitor(env)
        return env
    return _init


# ==========================================
# TRAINING
# ==========================================

def train(args):
    """Run training loop."""
    print("=" * 70)
    print("  The Shifting Chasm - High-Performance RL Training")
    print("=" * 70)
    print(f"  Mode:         {'WebSocket' if args.websocket else 'Selenium'}")
    print(f"  Timesteps:    {args.timesteps:,}")
    print(f"  Headless:     {args.headless}")
    print(f"  Model:        {args.model_path}")
    print("=" * 70)

    # Initialize progress tracker
    tracker = ProgressTracker(args.progress_dir)
    tracker.start_session()

    if args.websocket:
        print("\n  WebSocket Mode Instructions:")
        print("  1. Ensure js/rl/rl-bridge.js is loaded in game")
        print("  2. Open game in browser")
        print("  3. Game will auto-connect to training server")
        print("=" * 70)

    # Create environment
    print("\nCreating environment...")
    env = make_env(
        use_websocket=args.websocket,
        headless=args.headless,
        game_url=args.game_url
    )()

    if args.websocket:
        print("\nWaiting for game client to connect...")
        input("Press Enter when game shows 'Connected to Python server'...")

    # Create or load model
    policy_kwargs = {}
    if TORCH_AVAILABLE:
        policy_kwargs['features_extractor_class'] = ShiftingChasmCNN
        policy_kwargs['features_extractor_kwargs'] = {'features_dim': 256}

    model_file = args.model_path + ".zip"
    if args.continue_training and os.path.exists(model_file):
        print(f"\n📂 Loading existing model from {args.model_path}...")
        print(f"   Previous progress: {tracker.progress['total_timesteps']:,} timesteps")
        model = PPO.load(args.model_path, env=env)
        model.learning_rate = args.learning_rate
    else:
        print("\n🆕 Creating new PPO model with custom CNN...")
        model = PPO(
            "MultiInputPolicy",
            env,
            policy_kwargs=policy_kwargs,
            learning_rate=args.learning_rate,
            n_steps=2048,
            batch_size=64,
            n_epochs=10,
            gamma=0.99,
            gae_lambda=0.95,
            clip_range=0.2,
            ent_coef=0.01,
            vf_coef=0.5,
            max_grad_norm=0.5,
            verbose=1,
            tensorboard_log="./tensorboard_logs/"
        )

    # Setup callbacks
    os.makedirs("./checkpoints/", exist_ok=True)

    checkpoint_callback = CheckpointCallback(
        save_freq=5000,
        save_path="./checkpoints/",
        name_prefix="shifting_chasm"
    )

    progress_callback = ProgressCallback(check_freq=500)
    tracking_callback = ProgressTrackingCallback(tracker)

    callbacks = [checkpoint_callback, progress_callback, tracking_callback]

    # Train
    print("\n" + "=" * 70)
    print("  Training started!")
    print("  Monitor: tensorboard --logdir ./tensorboard_logs/")
    print("  Press Ctrl+C to stop and save.")
    print("=" * 70 + "\n")

    start_time = time.time()

    try:
        model.learn(
            total_timesteps=args.timesteps,
            callback=callbacks,
            progress_bar=True,
            reset_num_timesteps=not args.continue_training
        )
        print("\n✅ Training completed!")

    except KeyboardInterrupt:
        print("\n\n⚠️ Training interrupted by user.")

    except Exception as e:
        print(f"\n❌ Training error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Record training time
        elapsed_minutes = (time.time() - start_time) / 60
        tracker.record_training_time(elapsed_minutes)

        # Save model
        print(f"\n💾 Saving model to {args.model_path}...")
        model.save(args.model_path)

        # Save progress
        tracker.progress["model_version"] += 1
        tracker.save()

        print("\n" + tracker.get_summary())

        # Cleanup
        time.sleep(1)
        env.close()

    print("\nTraining session finished.")


# ==========================================
# SPECTATE MODE
# ==========================================

def spectate(args):
    """
    Spectate mode - watch the trained AI play with detailed HUD.
    This lets you "log into the AI's account" and see its behavior.
    """
    print("=" * 70)
    print("  🎮 SPECTATE MODE - Watching Trained AI")
    print("=" * 70)

    # Load progress
    tracker = ProgressTracker(args.progress_dir)
    print(tracker.get_summary())

    model_file = args.model_path + ".zip"
    if not os.path.exists(model_file):
        print(f"\n❌ No model found at {args.model_path}")
        print("Train a model first with: python train.py")
        return

    # Create environment
    print("\nCreating environment...")
    env = make_env(
        use_websocket=args.websocket,
        headless=False,
        game_url=args.game_url
    )()

    if args.websocket:
        print("\nWaiting for game client to connect...")
        input("Press Enter when game is connected...")

    # Load model
    print(f"\n📂 Loading model from {args.model_path}...")
    model = PPO.load(args.model_path)

    print("\n" + "=" * 70)
    print("  🤖 AI is now playing! Watch the browser.")
    print("  Press Ctrl+C to stop.")
    print("=" * 70 + "\n")

    try:
        episode = 0
        session_rewards = []

        while True:
            episode += 1
            obs, info = env.reset()

            episode_reward = 0
            steps = 0
            done = False
            action_counts = {}

            print(f"\n{'='*50}")
            print(f"  Episode {episode} | State: {info.get('state', 'unknown')}")
            print(f"{'='*50}")

            while not done:
                # Get action from trained model
                action, _ = model.predict(obs, deterministic=True)

                # Track action
                action_name = SemanticAction(action).name if action < len(SemanticAction) else str(action)
                action_counts[action_name] = action_counts.get(action_name, 0) + 1

                # Print current decision (every 10 steps)
                if steps % 10 == 0:
                    hp = obs['stats'][0]
                    hp_pct = obs['stats'][9] * 100
                    enemies = int(obs['stats'][5])
                    floor = int(obs['stats'][4])
                    safety = "🛡️" if info.get('safety_override') else ""
                    print(f"  Step {steps:4d} | HP: {hp:3.0f} ({hp_pct:2.0f}%) | "
                          f"Enemies: {enemies} | Floor: {floor} | "
                          f"Action: {action_name} {safety}")

                # Take action
                obs, reward, terminated, truncated, info = env.step(action)
                done = terminated or truncated

                episode_reward += reward
                steps += 1

            session_rewards.append(episode_reward)

            # Episode summary
            print(f"\n  📊 Episode {episode} Summary:")
            print(f"     Reward: {episode_reward:.2f}")
            print(f"     Steps: {steps}")
            print(f"     Floor: {info.get('floor', 1)}")
            print(f"     Result: {info.get('state', 'unknown')}")
            print(f"     Actions: {action_counts}")
            print(f"     Session Avg: {np.mean(session_rewards):.2f}")

            # Show save info if available
            if 'save_info' in info:
                si = info['save_info']
                print(f"\n  💾 Save Progression:")
                print(f"     Bank: {si.get('bank_gold', 0):,}g, {si.get('bank_items', 0)} items")
                print(f"     Deepest: Floor {si.get('deepest_floor', 1)}")
                print(f"     Runs: {si.get('total_runs', 0)} total ({si.get('extractions', 0)} extractions)")

            time.sleep(1)

    except KeyboardInterrupt:
        print("\n\n👋 Spectate mode ended.")

    finally:
        env.close()


# ==========================================
# STATS DISPLAY
# ==========================================

def show_stats(args):
    """Display training stats and progress."""
    tracker = ProgressTracker(args.progress_dir)

    print(tracker.get_summary())
    print("\n" + tracker.get_recent_episodes(20))


# ==========================================
# TESTING
# ==========================================

def test(args):
    """Test a trained model (benchmark mode)."""
    print("=" * 70)
    print("  The Shifting Chasm - Testing Trained Agent")
    print("=" * 70)

    model_file = args.model_path + ".zip"
    if not os.path.exists(model_file):
        print(f"Error: No model found at {args.model_path}")
        return

    env = make_env(
        use_websocket=args.websocket,
        headless=False,
        game_url=args.game_url
    )()

    if args.websocket:
        print("\nWaiting for game client to connect...")
        input("Press Enter when game is connected...")

    print(f"Loading model from {args.model_path}...")
    model = PPO.load(args.model_path)

    print("\nRunning 10 test episodes...")

    rewards = []
    floors = []
    for ep in range(10):
        obs, info = env.reset()
        ep_reward = 0
        done = False

        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated
            ep_reward += reward

        rewards.append(ep_reward)
        floors.append(info.get('floor', 1))
        print(f"  Episode {ep+1}: reward={ep_reward:.2f}, floor={info.get('floor', 1)}, state={info.get('state')}")

    print(f"\n📊 Test Results (10 episodes):")
    print(f"   Avg Reward: {np.mean(rewards):.2f} ± {np.std(rewards):.2f}")
    print(f"   Avg Floor:  {np.mean(floors):.1f}")

    env.close()


# ==========================================
# MAIN
# ==========================================

def main():
    parser = argparse.ArgumentParser(
        description="Train and spectate RL agent for The Shifting Chasm",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python train.py --websocket --timesteps 100000  # Fast WebSocket training
  python train.py --continue --timesteps 50000    # Continue from checkpoint
  python train.py --spectate                      # Watch AI play
  python train.py --stats                         # View training progress
  python train.py --test                          # Benchmark 10 episodes
        """
    )

    # Mode selection
    parser.add_argument("--websocket", "-ws", action="store_true",
                        help="Use WebSocket mode (fast)")
    parser.add_argument("--headless", action="store_true",
                        help="Run headlessly (Selenium only)")

    # Training params
    parser.add_argument("--timesteps", type=int, default=10000,
                        help="Training timesteps (default: 10000)")
    parser.add_argument("--learning-rate", "-lr", type=float, default=3e-4,
                        help="Learning rate (default: 3e-4)")

    # Model management
    parser.add_argument("--model-path", type=str, default="shifting_chasm_agent",
                        help="Model save path")
    parser.add_argument("--progress-dir", type=str, default="ai_progress",
                        help="Progress tracking directory")
    parser.add_argument("--continue", dest="continue_training", action="store_true",
                        help="Continue from existing model")

    # Modes
    parser.add_argument("--test", action="store_true",
                        help="Benchmark test mode")
    parser.add_argument("--spectate", action="store_true",
                        help="Watch the AI play")
    parser.add_argument("--stats", action="store_true",
                        help="Show training stats")

    # Game config
    parser.add_argument("--game-url", type=str, default="http://localhost:8000/index.html",
                        help="Game URL")

    args = parser.parse_args()

    if not SB3_AVAILABLE:
        print("Error: stable-baselines3 required")
        print("Install: pip install 'stable-baselines3[extra]'")
        return

    if args.stats:
        show_stats(args)
    elif args.spectate:
        spectate(args)
    elif args.test:
        test(args)
    else:
        train(args)


if __name__ == "__main__":
    main()
