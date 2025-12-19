from stable_baselines3 import PPO
from game_env import ShiftingChasmEnv
import time
import os

def run_training():
    print("Launching Game...")
    env = ShiftingChasmEnv()

    print("Loading AI Model...")
    model = PPO("MultiInputPolicy", env, verbose=1)

    print("Starting Training! Watch the browser window.")
    try:
        model.learn(total_timesteps=10000)
        model.save("roguelike_agent_v1")
        print("Training finished. Model saved.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        time.sleep(2)
        env.close()

if __name__ == "__main__":
    run_training()