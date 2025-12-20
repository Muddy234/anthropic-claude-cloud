#!/usr/bin/env python3
"""
Training script for The Shifting Chasm RL agent.

Uses Stable Baselines3 PPO with the ShiftingChasmEnv gymnasium environment.

Usage:
    python train.py                    # Train with default settings
    python train.py --timesteps 50000  # Train for more steps
    python train.py --headless         # Run without browser window
    python train.py --continue         # Continue from saved model
    python train.py --test             # Test saved model
"""

import argparse
import os
import time
from datetime import datetime

# Check for required packages
try:
    from stable_baselines3 import PPO
    from stable_baselines3.common.callbacks import CheckpointCallback, EvalCallback
    from stable_baselines3.common.monitor import Monitor
except ImportError:
    print("Error: stable-baselines3 not installed.")
    print("Install with: pip install stable-baselines3[extra]")
    exit(1)

from game_env import ShiftingChasmEnv


def create_environment(headless=False, game_url="http://localhost:8000/index.html"):
    """Create and wrap the game environment"""
    env = ShiftingChasmEnv(headless=headless, game_url=game_url)
    env = Monitor(env)  # Wrap for logging
    return env


def train(args):
    """Run training loop"""
    print("=" * 60)
    print("  The Shifting Chasm - RL Training")
    print("=" * 60)
    print(f"  Timesteps:    {args.timesteps:,}")
    print(f"  Headless:     {args.headless}")
    print(f"  Model path:   {args.model_path}")
    print(f"  Game URL:     {args.game_url}")
    print("=" * 60)

    # Create environment
    print("\nLaunching game environment...")
    env = create_environment(headless=args.headless, game_url=args.game_url)

    # Create or load model
    if args.continue_training and os.path.exists(args.model_path + ".zip"):
        print(f"\nLoading existing model from {args.model_path}...")
        model = PPO.load(args.model_path, env=env)
    else:
        print("\nCreating new PPO model...")
        model = PPO(
            "MultiInputPolicy",
            env,
            verbose=1,
            learning_rate=3e-4,
            n_steps=2048,
            batch_size=64,
            n_epochs=10,
            gamma=0.99,
            gae_lambda=0.95,
            clip_range=0.2,
            ent_coef=0.01,  # Encourage exploration
            tensorboard_log="./tensorboard_logs/"
        )

    # Setup callbacks
    os.makedirs("./checkpoints/", exist_ok=True)

    checkpoint_callback = CheckpointCallback(
        save_freq=5000,
        save_path="./checkpoints/",
        name_prefix="shifting_chasm"
    )

    # Train
    print("\n" + "=" * 60)
    print("  Starting training! Watch the browser window.")
    print("  Press Ctrl+C to stop early and save.")
    print("=" * 60 + "\n")

    try:
        model.learn(
            total_timesteps=args.timesteps,
            callback=checkpoint_callback,
            progress_bar=True
        )
        print("\nTraining completed!")

    except KeyboardInterrupt:
        print("\n\nTraining interrupted by user.")

    except Exception as e:
        print(f"\nTraining error: {e}")

    finally:
        # Save final model
        print(f"\nSaving model to {args.model_path}...")
        model.save(args.model_path)
        print("Model saved!")

        # Cleanup
        time.sleep(1)
        env.close()

    print("\nTraining session finished.")


def test(args):
    """Test a trained model"""
    print("=" * 60)
    print("  The Shifting Chasm - Testing Trained Agent")
    print("=" * 60)

    if not os.path.exists(args.model_path + ".zip"):
        print(f"Error: No model found at {args.model_path}")
        print("Train a model first with: python train.py")
        return

    # Create environment
    print("\nLaunching game environment...")
    env = create_environment(headless=False, game_url=args.game_url)

    # Load model
    print(f"Loading model from {args.model_path}...")
    model = PPO.load(args.model_path)

    # Run episodes
    print("\nRunning test episodes...")
    print("Press Ctrl+C to stop.\n")

    try:
        episode = 0
        while True:
            episode += 1
            obs, info = env.reset()

            total_reward = 0
            steps = 0
            done = False

            print(f"Episode {episode} starting...")

            while not done:
                # Get action from trained model
                action, _ = model.predict(obs, deterministic=True)

                # Take action
                obs, reward, terminated, truncated, info = env.step(action)
                done = terminated or truncated

                total_reward += reward
                steps += 1

                # Small delay so we can see what's happening
                time.sleep(0.05)

            print(f"  Episode {episode}: {steps} steps, reward={total_reward:.2f}, "
                  f"floor={info.get('floor', 1)}, HP={info.get('hp', 0)}")

            time.sleep(1)

    except KeyboardInterrupt:
        print("\n\nTest stopped by user.")

    finally:
        env.close()


def main():
    parser = argparse.ArgumentParser(description="Train RL agent for The Shifting Chasm")

    parser.add_argument("--timesteps", type=int, default=10000,
                        help="Number of training timesteps (default: 10000)")
    parser.add_argument("--headless", action="store_true",
                        help="Run browser in headless mode")
    parser.add_argument("--model-path", type=str, default="shifting_chasm_agent",
                        help="Path to save/load model (default: shifting_chasm_agent)")
    parser.add_argument("--game-url", type=str, default="http://localhost:8000/index.html",
                        help="URL of the game")
    parser.add_argument("--continue", dest="continue_training", action="store_true",
                        help="Continue training from existing model")
    parser.add_argument("--test", action="store_true",
                        help="Test a trained model instead of training")

    args = parser.parse_args()

    if args.test:
        test(args)
    else:
        train(args)


if __name__ == "__main__":
    main()
