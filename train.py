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
    - Model checkpointing

Usage:
    # WebSocket mode (high performance, requires rl-bridge.js in game)
    python train.py --websocket --timesteps 100000

    # Selenium mode (fallback, slower but no game modification needed)
    python train.py --timesteps 10000

    # Continue training from checkpoint
    python train.py --continue --timesteps 50000

    # Test a trained model
    python train.py --test

    # Headless training (Selenium mode only)
    python train.py --headless --timesteps 10000
"""

import argparse
import os
import time
from datetime import datetime
from typing import Dict, Any

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

from game_env import ShiftingChasmEnv, GameState


# ==========================================
# CUSTOM CNN FEATURE EXTRACTOR
# ==========================================

if SB3_AVAILABLE and TORCH_AVAILABLE:

    class ShiftingChasmCNN(BaseFeaturesExtractor):
        """
        Custom CNN feature extractor for multi-channel spatial observations.

        Processes the (11, 11, 4) spatial tensor through convolutions while
        also incorporating the stats vector.

        Architecture:
            Spatial (11x11x4) → Conv2D → Conv2D → Flatten → FC
            Stats (10,) → FC
            Combined → FC → Features (256)
        """

        def __init__(self, observation_space, features_dim: int = 256):
            super().__init__(observation_space, features_dim)

            # Spatial pathway (for 11x11x4 tensor)
            # Input: (batch, 11, 11, 4) → need to permute to (batch, 4, 11, 11)
            self.spatial_net = nn.Sequential(
                # Conv1: 4 → 32 channels, 3x3 kernel
                nn.Conv2d(4, 32, kernel_size=3, stride=1, padding=1),
                nn.ReLU(),
                # Conv2: 32 → 64 channels, 3x3 kernel
                nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1),
                nn.ReLU(),
                # Conv3: 64 → 64 channels, 3x3 kernel, stride 2 for downsampling
                nn.Conv2d(64, 64, kernel_size=3, stride=2, padding=1),
                nn.ReLU(),
                nn.Flatten()
            )

            # Calculate spatial output size: 11x11 → (with stride 2) → 6x6
            # 64 channels * 6 * 6 = 2304
            spatial_output_size = 64 * 6 * 6

            # Stats pathway (for 10-dim vector)
            stats_dim = observation_space['stats'].shape[0]
            self.stats_net = nn.Sequential(
                nn.Linear(stats_dim, 64),
                nn.ReLU(),
                nn.Linear(64, 64),
                nn.ReLU()
            )

            # Combined pathway
            self.combined_net = nn.Sequential(
                nn.Linear(spatial_output_size + 64, 256),
                nn.ReLU(),
                nn.Linear(256, features_dim),
                nn.ReLU()
            )

        def forward(self, observations: Dict[str, torch.Tensor]) -> torch.Tensor:
            # Extract spatial and stats
            spatial = observations['spatial']  # (batch, 11, 11, 4)
            stats = observations['stats']      # (batch, 10)

            # Permute spatial: (batch, H, W, C) → (batch, C, H, W)
            spatial = spatial.permute(0, 3, 1, 2)

            # Process pathways
            spatial_features = self.spatial_net(spatial)
            stats_features = self.stats_net(stats)

            # Combine
            combined = torch.cat([spatial_features, stats_features], dim=1)
            return self.combined_net(combined)


# ==========================================
# CUSTOM CALLBACKS
# ==========================================

class RewardLoggingCallback(BaseCallback):
    """Callback for logging detailed reward information."""

    def __init__(self, verbose: int = 0):
        super().__init__(verbose)
        self.episode_rewards = []
        self.episode_lengths = []
        self.episode_floors = []

    def _on_step(self) -> bool:
        # Check for episode end
        for idx, done in enumerate(self.locals.get('dones', [])):
            if done:
                info = self.locals.get('infos', [{}])[idx]
                if 'episode' in info:
                    self.episode_rewards.append(info['episode']['r'])
                    self.episode_lengths.append(info['episode']['l'])
                if 'floor' in info:
                    self.episode_floors.append(info['floor'])

        return True

    def _on_rollout_end(self) -> None:
        if self.episode_rewards:
            self.logger.record('rollout/ep_rew_mean', np.mean(self.episode_rewards[-100:]))
            self.logger.record('rollout/ep_len_mean', np.mean(self.episode_lengths[-100:]))
            if self.episode_floors:
                self.logger.record('rollout/floor_mean', np.mean(self.episode_floors[-100:]))


class ProgressCallback(BaseCallback):
    """Callback for printing training progress."""

    def __init__(self, check_freq: int = 1000, verbose: int = 1):
        super().__init__(verbose)
        self.check_freq = check_freq
        self.start_time = None
        self.last_log_time = None

    def _on_training_start(self) -> None:
        self.start_time = time.time()
        self.last_log_time = self.start_time

    def _on_step(self) -> bool:
        if self.n_calls % self.check_freq == 0:
            elapsed = time.time() - self.start_time
            sps = self.n_calls / elapsed if elapsed > 0 else 0

            # Get recent rewards
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
    game_url: str = "http://localhost:8000/index.html"
):
    """Create and wrap the game environment."""
    def _init():
        env = ShiftingChasmEnv(
            use_websocket=use_websocket,
            headless=headless,
            game_url=game_url
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
    print(f"  Game URL:     {args.game_url}")
    print("=" * 70)

    if args.websocket:
        print("\n  WebSocket Mode Instructions:")
        print("  1. Add this line to your game's index.html:")
        print("     <script src=\"js/rl/rl-bridge.js\"></script>")
        print("  2. Start the game server: python -m http.server 8000")
        print("  3. Open the game in browser")
        print("  4. The game will auto-connect to this training server")
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
        print("Open the game in browser (with rl-bridge.js loaded)")
        input("Press Enter when the game shows 'Connected to Python server'...")

    # Create or load model
    policy_kwargs = {}
    if TORCH_AVAILABLE:
        policy_kwargs['features_extractor_class'] = ShiftingChasmCNN
        policy_kwargs['features_extractor_kwargs'] = {'features_dim': 256}

    if args.continue_training and os.path.exists(args.model_path + ".zip"):
        print(f"\nLoading existing model from {args.model_path}...")
        model = PPO.load(args.model_path, env=env)
        # Update learning rate if continuing
        model.learning_rate = args.learning_rate
    else:
        print("\nCreating new PPO model with custom CNN...")
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
    reward_callback = RewardLoggingCallback()

    callbacks = [checkpoint_callback, progress_callback, reward_callback]

    # Train
    print("\n" + "=" * 70)
    print("  Training started! Monitor in browser or Tensorboard.")
    print("  Tensorboard: tensorboard --logdir ./tensorboard_logs/")
    print("  Press Ctrl+C to stop and save.")
    print("=" * 70 + "\n")

    try:
        model.learn(
            total_timesteps=args.timesteps,
            callback=callbacks,
            progress_bar=True,
            reset_num_timesteps=not args.continue_training
        )
        print("\nTraining completed!")

    except KeyboardInterrupt:
        print("\n\nTraining interrupted by user.")

    except Exception as e:
        print(f"\nTraining error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Save final model
        print(f"\nSaving model to {args.model_path}...")
        model.save(args.model_path)
        print("Model saved!")

        # Save training stats
        stats_path = args.model_path + "_stats.txt"
        with open(stats_path, 'w') as f:
            f.write(f"Training completed at: {datetime.now()}\n")
            f.write(f"Total timesteps: {model.num_timesteps}\n")
            f.write(f"Mode: {'WebSocket' if args.websocket else 'Selenium'}\n")

        # Cleanup
        time.sleep(1)
        env.close()

    print("\nTraining session finished.")


# ==========================================
# TESTING
# ==========================================

def test(args):
    """Test a trained model."""
    print("=" * 70)
    print("  The Shifting Chasm - Testing Trained Agent")
    print("=" * 70)

    if not os.path.exists(args.model_path + ".zip"):
        print(f"Error: No model found at {args.model_path}")
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
    print(f"Loading model from {args.model_path}...")
    model = PPO.load(args.model_path)

    # Run episodes
    print("\nRunning test episodes...")
    print("Press Ctrl+C to stop.\n")

    try:
        episode = 0
        total_rewards = []

        while True:
            episode += 1
            obs, info = env.reset()

            episode_reward = 0
            steps = 0
            done = False

            print(f"Episode {episode} starting... (state: {info.get('state', 'unknown')})")

            while not done:
                # Get action from trained model
                action, _ = model.predict(obs, deterministic=True)

                # Take action
                obs, reward, terminated, truncated, info = env.step(action)
                done = terminated or truncated

                episode_reward += reward
                steps += 1

                # Small delay to see what's happening
                if not args.websocket:
                    time.sleep(0.02)

            total_rewards.append(episode_reward)
            avg_reward = np.mean(total_rewards[-10:])

            print(f"  Episode {episode}: "
                  f"steps={steps}, "
                  f"reward={episode_reward:.2f}, "
                  f"avg10={avg_reward:.2f}, "
                  f"floor={info.get('floor', 1)}, "
                  f"state={info.get('state', 'unknown')}")

            time.sleep(0.5)

    except KeyboardInterrupt:
        print("\n\nTest stopped by user.")

    finally:
        env.close()


# ==========================================
# MAIN
# ==========================================

def main():
    parser = argparse.ArgumentParser(
        description="Train RL agent for The Shifting Chasm",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python train.py --websocket --timesteps 100000  # Fast WebSocket training
  python train.py --timesteps 10000               # Selenium fallback
  python train.py --continue --timesteps 50000    # Continue training
  python train.py --test                          # Test trained agent
        """
    )

    # Mode selection
    parser.add_argument("--websocket", "-ws", action="store_true",
                        help="Use WebSocket mode (fast, requires rl-bridge.js)")
    parser.add_argument("--headless", action="store_true",
                        help="Run browser headlessly (Selenium mode only)")

    # Training params
    parser.add_argument("--timesteps", type=int, default=10000,
                        help="Number of training timesteps (default: 10000)")
    parser.add_argument("--learning-rate", "-lr", type=float, default=3e-4,
                        help="Learning rate (default: 3e-4)")

    # Model management
    parser.add_argument("--model-path", type=str, default="shifting_chasm_agent",
                        help="Path to save/load model (default: shifting_chasm_agent)")
    parser.add_argument("--continue", dest="continue_training", action="store_true",
                        help="Continue training from existing model")

    # Testing
    parser.add_argument("--test", action="store_true",
                        help="Test a trained model instead of training")

    # Game config
    parser.add_argument("--game-url", type=str, default="http://localhost:8000/index.html",
                        help="URL of the game")

    args = parser.parse_args()

    if not SB3_AVAILABLE:
        print("Error: stable-baselines3 is required.")
        print("Install with: pip install 'stable-baselines3[extra]'")
        return

    if args.test:
        test(args)
    else:
        train(args)


if __name__ == "__main__":
    main()
