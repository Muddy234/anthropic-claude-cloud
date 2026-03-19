1. Good feedback. Agreed with your suggested fix.
2. Below is the mathematics behind skill leveling, what is your recommendation?
XP Analysis: Reaching Level 100

  Total XP Required for Level 100

  Using the formula XP = 100 × (level + 1)^1.5:
  ┌─────────────┬─────────────┬────────────┐
  │ Level Range │ XP Required │ Cumulative │
  ├─────────────┼─────────────┼────────────┤
  │ 0 → 10      │ 18,621      │ 18,621     │
  ├─────────────┼─────────────┼────────────┤
  │ 10 → 25     │ 91,904      │ 110,525    │
  ├─────────────┼─────────────┼────────────┤
  │ 25 → 50     │ 471,213     │ 581,738    │
  ├─────────────┼─────────────┼────────────┤
  │ 50 → 75     │ 762,079     │ 1,343,817  │
  ├─────────────┼─────────────┼────────────┤
  │ 75 → 100    │ 1,106,283   │ 2,450,100  │
  └─────────────┴─────────────┴────────────┘
  Total XP to reach Level 100: ~2,450,000 XP (for ONE proficiency)

  ---
  Monster Kill Analysis

  XP Earned Per Kill:
  - XP formula: 0.5 × damage dealt
  - Average monster HP: ~50 (range: 20-120)
  - XP per kill: ~25 XP (killing a 50 HP monster)

  Monsters Per Floor:
  From the spawner config:
  - Base: 3 enemies + 0-3 variance per room
  - Density: 6% of floor tiles
  - Max: 9 enemies per room
  - Estimated: 30-50 enemies per floor (across multiple rooms)

  Total Monsters in 10 Floors:
  - Conservative: 30 × 10 = 300 monsters
  - Generous: 50 × 10 = 500 monsters

  ---
  The Math Problem
  ┌────────────────────────────────────────────┬───────────────────┐
  │                   Metric                   │       Value       │
  ├────────────────────────────────────────────┼───────────────────┤
  │ Total XP from full run (500 kills × 25 XP) │ 12,500 XP         │
  ├────────────────────────────────────────────┼───────────────────┤
  │ XP needed for level 100                    │ 2,450,000 XP      │
  ├────────────────────────────────────────────┼───────────────────┤
  │ Runs needed for level 100                  │ 196 complete runs │
  ├────────────────────────────────────────────┼───────────────────┤
  │ Kills needed for level 100                 │ 98,000 monsters   │
  └────────────────────────────────────────────┴───────────────────┘
  ---
  Achievable Level Per Run

  With 12,500 XP from a complete 10-floor run:
  ┌───────────────┬────────────────────┐
  │ Cumulative XP │   Level Reached    │
  ├───────────────┼────────────────────┤
  │ 100           │ 1                  │
  ├───────────────┼────────────────────┤
  │ 383           │ 2                  │
  ├───────────────┼────────────────────┤
  │ 903           │ 3                  │
  ├───────────────┼────────────────────┤
  │ 1,703         │ 4                  │
  ├───────────────┼────────────────────┤
  │ 2,821         │ 5 (action unlocks) │
  ├───────────────┼────────────────────┤
  │ 4,291         │ 6                  │
  ├───────────────┼────────────────────┤
  │ 6,143         │ 7                  │
  ├───────────────┼────────────────────┤
  │ 8,406         │ 8                  │
  ├───────────────┼────────────────────┤
  │ 11,106        │ 9                  │
  ├───────────────┼────────────────────┤
  │ 14,238        │ 10                 │
  └───────────────┴────────────────────┘
  Realistic level in one run: ~8-9 (if focusing all XP on one proficiency)

  ---
  The Core Problem

  Skills reset on death. This means:

  1. You can only reach level 8-9 in a single proficiency per run
  2. Level 100 is mathematically impossible to reach
  3. The level 100 bonuses (3x damage, 20% damage reduction, etc.) are never achievable
  4. Action scaling above level 5 provides minimal benefit (only 4-8% more damage)

  ---
3. I understand your concerns, but full loss at death is what I want.
4. I'm concerned about both defense and vitality. How does the player level these up? Should these even be skills or health and armor are all covered by equipment?
5. I don't like the expertise functions at all. I'll plan to remove them.
6. Agreed. This is a problem for later though.
7. Agreed. Please provide a recommendation for standardizing all of these.
8. Agreed. I want to replace the consumables slots with these abilities, please provide your recommendation.
9. Agreed. Please provide a recommendation to fix. 