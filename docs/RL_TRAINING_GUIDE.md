# RL Training Guide for The Shifting Chasm

This guide walks through every step of training an AI bot to play the game.

---

## Prerequisites

### 1. Install Python Dependencies

```bash
# Navigate to the project directory
cd /home/user/anthropic-claude-cloud

# Install required packages
pip install gymnasium stable-baselines3[extra] websockets numpy torch
```

### 2. Verify Files Exist

Ensure these files are present:
- `game_env.py` - RL environment
- `train.py` - Training script
- `js/rl/rl-bridge.js` - Browser-side WebSocket bridge

---

## Step-by-Step Training

### Terminal 1: Start the Game Server

```bash
# Navigate to project root
cd /home/user/anthropic-claude-cloud

# Start a local HTTP server (Python 3)
python -m http.server 8000
```

You should see:
```
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

**Keep this terminal running.**

---

### Terminal 2: Open the Game in Browser

Open a web browser and navigate to:
```
http://localhost:8000/index.html
```

The game should load. You'll see in the browser console:
```
[RL] rl-bridge.js loaded (egocentric features enabled)
[RL Bridge] Initializing RL Bridge with Egocentric Features...
```

The game will try to connect to the Python training server. It will keep retrying until the server starts.

---

### Terminal 3: Start Training

```bash
# Navigate to project root
cd /home/user/anthropic-claude-cloud

# Start training with WebSocket mode (recommended)
python train.py --websocket --timesteps 100000
```

You'll see:
```
======================================================================
  The Shifting Chasm - High-Performance RL Training
======================================================================
  Mode:         WebSocket
  Timesteps:    100,000
  Headless:     False
  Model:        shifting_chasm_agent
======================================================================

  WebSocket Mode Instructions:
  1. Ensure js/rl/rl-bridge.js is loaded in game
  2. Open game in browser
  3. Game will auto-connect to training server
======================================================================

Creating environment...
Starting WebSocket server...
WebSocket server starting on ws://localhost:8765
Waiting for game client to connect on ws://localhost:8765
```

**Press Enter** once the browser console shows:
```
[RL Bridge] Connected to Python RL server
```

Training will begin!

---

## Reading Training Output

### During Training

```
Step 500 | SPS: 45.2 | Reward: -2.34 | Ep Len: 127 | Time: 0.2m
Step 1,000 | SPS: 48.1 | Reward: -1.82 | Ep Len: 156 | Time: 0.3m
Step 1,500 | SPS: 52.3 | Reward: 0.45 | Ep Len: 203 | Time: 0.5m
```

| Metric | Meaning |
|--------|---------|
| **Step** | Total training steps completed |
| **SPS** | Steps Per Second (higher = faster training) |
| **Reward** | Average episode reward (higher = better) |
| **Ep Len** | Average episode length in steps |
| **Time** | Total training time |

### What Good Progress Looks Like

- **Early (0-50k steps)**: Reward is negative, agent dies quickly
- **Mid (50k-200k)**: Reward trends upward, episode length increases
- **Late (200k+)**: Reward stabilizes positive, agent survives longer

---

## Training Commands Reference

### Basic Training (100k steps)
```bash
python train.py --websocket --timesteps 100000
```

### Continue from Checkpoint
```bash
python train.py --websocket --timesteps 100000 --continue
```

### Long Training Run (500k steps)
```bash
python train.py --websocket --timesteps 500000 --continue
```

### View Training Stats
```bash
python train.py --stats
```

Output:
```
╔══════════════════════════════════════════════════════════════════════╗
║                    🤖 AI AGENT PROGRESS REPORT                       ║
╠══════════════════════════════════════════════════════════════════════╣
║  Created:           2024-01-15 10:30:00
║  Last Trained:      2024-01-15 14:45:22
║  Model Version:     v3
╠══════════════════════════════════════════════════════════════════════╣
║  📊 TRAINING STATS
║  ─────────────────────────────────────────────────────────────────────
║  Total Timesteps:   250,000
║  Total Episodes:    1,247
║  Training Time:     45.2 minutes
║  Training Sessions: 3
╠══════════════════════════════════════════════════════════════════════╣
║  🏆 ACHIEVEMENTS
║  ─────────────────────────────────────────────────────────────────────
║  Best Reward:       15.67
║  Best Floor:        3
║  Extractions:       42
║  Deaths:            1,205
║  Survival Rate:     3.4%
╠══════════════════════════════════════════════════════════════════════╣
║  💾 IN-GAME SAVE (Roguelite Progression)
║  ─────────────────────────────────────────────────────────────────────
║  Bank Gold:         2,450
║  Bank Items:        8
║  Skills Unlocked:   2
║  Deepest Floor:     3
║  Unlocked Floors:   1, 2, 3
║  Game Runs:         1,247 (42 extractions, 1,205 deaths)
╠══════════════════════════════════════════════════════════════════════╣
║  📈 PERFORMANCE (Last 100 Episodes)
║  ─────────────────────────────────────────────────────────────────────
║  Avg Reward:        3.45
║  Trend:             +1.23
╚══════════════════════════════════════════════════════════════════════╝
```

### Watch the AI Play (Spectate Mode)
```bash
python train.py --websocket --spectate
```

This loads the trained model and lets you watch it play in real-time with detailed logging:
```
==================================================
  Episode 1 | State: DUNGEON_RUN
==================================================
  Step    0 | HP: 100 (100%) | Enemies: 2 | Floor: 1 | Action: ATTACK_NEAREST_ENEMY
  Step   10 | HP:  85 ( 85%) | Enemies: 1 | Floor: 1 | Action: ATTACK_NEAREST_ENEMY
  Step   20 | HP:  70 ( 70%) | Enemies: 0 | Floor: 1 | Action: COLLECT_NEAREST_LOOT
  Step   30 | HP:  70 ( 70%) | Enemies: 0 | Floor: 1 | Action: EXPLORE
  ...

  📊 Episode 1 Summary:
     Reward: 5.67
     Steps: 234
     Floor: 2
     Result: DEAD
     Actions: {'ATTACK_NEAREST_ENEMY': 45, 'EXPLORE': 89, 'COLLECT_NEAREST_LOOT': 23, ...}
     Session Avg: 5.67

  💾 Save Progression:
     Bank: 150g, 2 items
     Deepest: Floor 2
     Runs: 1 total (0 extractions)
```

### Benchmark Test (10 episodes)
```bash
python train.py --websocket --test
```

---

## Understanding the Semantic Actions

The AI uses high-level semantic actions instead of raw movement:

| Action | Description |
|--------|-------------|
| `WAIT` | Do nothing (no-op) |
| `ATTACK_NEAREST_ENEMY` | Path to and attack closest enemy |
| `ATTACK_WEAKEST_ENEMY` | Path to and attack lowest HP enemy |
| `COLLECT_NEAREST_LOOT` | Path to and pick up nearest loot |
| `COLLECT_BEST_LOOT` | Path to and pick up highest value loot |
| `EXPLORE` | Move toward unexplored area |
| `RETREAT` | Move away from enemies |
| `USE_POTION` | Use healing potion if available |
| `INTERACT` | Interact with nearest object |
| `GOTO_EXTRACTION` | Path to extraction point |

---

## Safety Guardrails

The system includes automatic safety overrides:

- **Emergency Heal**: Uses potion when HP < 15%
- **Low HP Heal**: Uses potion when HP < 30% and in combat
- **Retreat**: Runs away when HP < 30%, in combat, and no potions
- **Auto-Attack**: Attacks if enemy is adjacent and HP > 50%

These help prevent the agent from dying too quickly during early training.

---

## File Locations

| File | Purpose |
|------|---------|
| `shifting_chasm_agent.zip` | Trained model weights |
| `ai_progress/progress.json` | Training statistics |
| `ai_progress/training_history.json` | Episode history |
| `checkpoints/` | Periodic model snapshots |
| `tensorboard_logs/` | TensorBoard training logs |

---

## Monitoring with TensorBoard

```bash
# In a new terminal
tensorboard --logdir ./tensorboard_logs/
```

Open `http://localhost:6006` to view live training graphs.

---

## Recommended Training Schedule

1. **Validation Run (verify setup works)**
   ```bash
   python train.py --websocket --timesteps 10000
   python train.py --stats
   ```

2. **Initial Training**
   ```bash
   python train.py --websocket --timesteps 100000 --continue
   python train.py --stats
   ```

3. **Extended Training**
   ```bash
   python train.py --websocket --timesteps 500000 --continue
   python train.py --spectate  # Watch AI play
   ```

4. **Deep Training (overnight)**
   ```bash
   python train.py --websocket --timesteps 1000000 --continue
   ```

---

## Troubleshooting

### "WebSocket connection failed"
- Ensure the game is open in browser before pressing Enter
- Check browser console for errors
- Try refreshing the game page

### "No observation received"
- Game window may be minimized or hidden
- Browser tab must be active (not in background)
- Try clicking on the game canvas

### Training is slow (low SPS)
- WebSocket mode should get 40-100+ SPS
- If using Selenium mode, expect 10-20 SPS
- Close other browser tabs

### Agent keeps dying immediately
- This is normal in early training
- Safety guardrails help, but agent needs time to learn
- Wait for 50k+ steps before judging performance

### Game freezes during training
- Press Ctrl+C to stop training gracefully
- Model will be saved automatically
- Restart with `--continue` to resume

---

## Quick Reference Card

```bash
# Start game server
python -m http.server 8000

# Open browser to: http://localhost:8000/index.html

# Train (first time)
python train.py --websocket --timesteps 100000

# Train (continuing)
python train.py --websocket --timesteps 100000 --continue

# View stats
python train.py --stats

# Watch AI play
python train.py --websocket --spectate

# Benchmark
python train.py --websocket --test
```
